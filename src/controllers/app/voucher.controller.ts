import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Voucher } from "../../models/voucher.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { Op } from "sequelize";
import { User } from "../../models/user.model";

/**
 * This controller is createVoucher that create new voucher of destination
 *
 */
export const createVoucher = catchAsync(async (req, res, next) => {
    const { name, image, destinationID, description, quantity, value, salePrice, refundRate, fromDate, toDate } = req.body;

    const today = Math.floor((Date.now() - new Date(fromDate).getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Bạn phải khuyến mãi trước khi khuyến mãi bắt đầu 1 ngày', StatusCodes.BAD_REQUEST))

    const destination = await Destination.findOne({ where: { id: destinationID, supplierID: res.locals.user.id, status: Status.open }, attributes: ['name'] });
    if (!destination || destination === null)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND));
    const user = await User.findOne({ where: { id: res.locals.user.id }, attributes: ['commissionRate'] })
    const voucher = new Voucher();
    voucher.name = name
    voucher.image = image
    voucher.destinationID = destinationID
    voucher.description = description
    voucher.quantity = quantity
    voucher.value = value
    voucher.salePrice = salePrice
    voucher.refundRate = refundRate
    voucher.fromDate = fromDate
    voucher.toDate = toDate
    user ? voucher.commissionRate = user.commissionRate : 0
    await voucher.save()
    const result = await Voucher.findOne({
        where: { id: voucher.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Đã thêm khuyến mãi vào địa điểm '${destination.name}'`, { voucher: result });
    next()
})

/**
 * This controller is getAllVoucher that get all vouchers of supplier
 *
 */
export const getAllVoucher = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const name = req.query.name as string ?? '';
    const status = ['Draft', 'Activated'].includes(req.query.status as string) ? req.query.status as string : 'Draft';

    const vouchers = await Voucher.findAll({
        where: { name: { [Op.iLike]: `%${name}%` }, status: status },
        attributes: ['id', 'name', 'quantity', 'totalSold', 'status', 'updatedAt'], include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ],
        order: [['updatedAt', 'DESC']]
    })

    const count = await Voucher.findAll(
        {
            where: { name: { [Op.iLike]: `%${name}%` }, status: status },
            attributes: ['id'],
            include: [
                {
                    model: Destination, as: 'destinationApply',
                    where: { supplierID: res.locals.user.id },
                    attributes: []
                }
            ],
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, vouchers: vouchers }
    )

    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

/**
 * This controller is getOneVoucher that get all vouchers of supplier
 *
 */
export const getOneVoucher = catchAsync(async (req, res, next) => {
    const isTraveler = res.locals.user.roleID === Roles.Traveler ? true : false;
    const query = isTraveler ? { id: req.params.id, status: Status.activated } : { id: req.params.id }
    const voucher = await Voucher.findOne({
        where: query,
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'refundRate', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: getOneInclude(isTraveler, res.locals.user.id)
    })

    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { voucher })
    next()
})

/**
 * This controller is activeVoucher that active a draft voucher
 *
 */
export const activeVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: 'Draft' },
    })

    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND))

    const today = Math.floor((Date.now() - new Date(voucher.fromDate).getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Bạn phải kích hoạt trước khi khuyến mãi bắt đầu 1 ngày', StatusCodes.BAD_REQUEST))

    await Voucher.update({ status: 'Activated' }, { where: { id: req.params.id } })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Kích hoạt khuyến mãi thành cônng', null)
    next()
})

/**
 * This controller is updateVoucher that update a draft voucher
 *
 */
export const updateVoucher = catchAsync(async (req, res, next) => {
    const { name, image, destinationID, description, quantity, value, salePrice, refundRate, fromDate, toDate } = req.body;

    if (destinationID) {
        const destination = await Destination.findOne({ where: { id: destinationID, supplierID: res.locals.user.id, status: Status.open }, attributes: ['name'] });
        if (!destination || destination === null)
            return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND));
    }

    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'refundRate', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));

    name ? voucher.name = name : 0
    image ? voucher.image = image : 0
    destinationID ? voucher.destinationID = destinationID : 0
    description ? voucher.description = description : 0
    quantity ? voucher.quantity = quantity : 0
    value ? voucher.value = value : 0
    salePrice ? voucher.salePrice = salePrice : 0
    refundRate ? voucher.refundRate = refundRate : 0
    fromDate ? voucher.fromDate = fromDate : 0
    toDate ? voucher.toDate = toDate : 0
    await voucher.save()

    const result = await Voucher.findOne({
        where: { id: req.params.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Cập nhật khuyến mãi thành công`, { voucher: result });
    next()
})


/**
 * This controller is deleteVoucher that delete a draft voucher
 *
 */
export const deleteVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));

    await voucher.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Xoá khuyến mãi thành công', null)
    next()
})


/**
 * This controller is deleteVoucher that delete a draft voucher
 *
 */
 export const buyVoucher = catchAsync(async (req, res, next) => {
    const voucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!voucher || voucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));

    await voucher.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Xoá khuyến mãi thành công', null)
    next()
})

/**
 * This controller is updateVoucher that update a draft voucher
 *
 */
export const duplicateVoucher = catchAsync(async (req, res, next) => {
    const targetVoucher = await Voucher.findOne({
        where: { id: req.params.id, status: Status.draft },
        attributes: ['id', 'destinationID', 'name', 'image', 'description', 'quantity', 'value', 'salePrice', 'refundRate', 'fromDate', 'toDate'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                where: { supplierID: res.locals.user.id },
                attributes: []
            }
        ]
    })
    if (!targetVoucher || targetVoucher === null)
        return next(new AppError('Không tìm thấy khuyến mãi này', StatusCodes.NOT_FOUND));
    const voucher = new Voucher()
    voucher.name = targetVoucher.name + ' (Bản sao)'
    voucher.destinationID = targetVoucher.destinationID
    voucher.image = targetVoucher.image
    voucher.description = targetVoucher.description
    voucher.quantity = targetVoucher.quantity
    voucher.value = targetVoucher.value
    voucher.salePrice = targetVoucher.salePrice
    voucher.refundRate = targetVoucher.refundRate
    voucher.fromDate = targetVoucher.fromDate
    voucher.toDate = targetVoucher.toDate
    await voucher.save()

    const result = await Voucher.findOne({
        where: { id: voucher.id },
        attributes: ['id', 'name', 'image', 'description', 'quantity', 'totalSold', 'value', 'salePrice', 'discountPercent', 'fromDate', 'toDate', 'status'],
        include: [
            {
                model: Destination, as: 'destinationApply',
                attributes: ['id', 'name', 'address', 'image', 'status']
            }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Đã tạo bản sao của khuyến mãi '${targetVoucher.name}'`, { voucher: result });
    next()
})


/**
 * This controller is getListDestnation that get all destinatiion of a supplier to create voucher
 *
 */
export const getListDestnation = catchAsync(async (_req, res, next) => {
    const destinations = await Destination.findAll({
        where: { supplierID: res.locals.user.id, status: Status.open },
        attributes: ['id', 'name', 'address'],
        order: [['name', 'ASC']]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', destinations)
    next()
})

const getOneInclude = (isTraveler: boolean, supplierID: string) => [
    {
        model: Destination, as: 'destinationApply',
        where: isTraveler ? { status: Status.open } : { supplierID: supplierID },
        attributes: ['id', 'name', 'address', 'image', 'status']
    }
]
