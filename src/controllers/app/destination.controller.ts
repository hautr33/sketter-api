import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { DestinationRecommendedTime } from "../../models/destination_recommended_time.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields, UserPrivateFields } from "../../utils/private_field";
import { DestinationImage } from "../../models/destination_image.model";
import { DestinationPersonalites } from "../../models/destination_personalities.model";
import sequelizeConnection from "../../db/sequelize.db";
import _ from "lodash"
import { Op, Sequelize } from "sequelize";
import { User } from "../../models/user.model";

export const createDestination = catchAsync(async (req, res, next) => {
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : req.body.supplierID;
    const error = await validate(req.body, supplierID)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = req.body;

    const images = req.body.images as DestinationImage[]

    const createdBy = res.locals.user.id;
    const result = await sequelizeConnection.transaction(async (create) => {
        const destination = await Destination.create({
            name: name, address: address, phone: phone, email: email, description: description,
            longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice,
            openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay, supplierID: supplierID, createdBy: createdBy
        }, { transaction: create })
        await destination.addCatalogs(catalogs, { transaction: create })
        await destination.addDestinationPersonalities(destinationPersonalities, { transaction: create })
        for (let i = 0; i < images.length; i++) {
            await destination.createImage(images[i], { transaction: create })
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination: result })
    next()
})

export const updateDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id } })
    if (!destination || res.locals.user.roleID != Roles["Supplier Manager"] && destination.supplierID != res.locals.user.id)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const error = await validate(req.body, destination.supplierID)
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, catalogs
    } = req.body;

    const images = req.body.images as DestinationImage[]

    destination.name = name
    destination.address = address
    destination.phone = phone
    destination.email = email
    destination.description = description
    destination.lowestPrice = lowestPrice
    destination.highestPrice = highestPrice
    destination.openingTime = openingTime
    destination.closingTime = closingTime

    const result = await sequelizeConnection.transaction(async (update) => {
        await destination.save({ transaction: update })
        await destination.setCatalogs(catalogs, { transaction: update })
        await DestinationImage.destroy({ where: { destinationID: destination.id }, transaction: update })
        for (let i = 0; i < images.length; i++) {
            await destination.createImage(images[i], { transaction: update })
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination: result })
    next()
})

export const searchDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const search = req.query.name as string;
    const roleID = res.locals.user.roleID;
    let option = {}
    let privatFields = DestinationPrivateFields.default
    if (roleID == Roles.Supplier) {
        option = { name: { [Op.regexp]: `${search.split(' ').join('|')}` }, supplierID: res.locals.user.id }
        privatFields = DestinationPrivateFields.getAllSupplier
    } else if (roleID == Roles.Traveler) {
        option = { name: { [Op.regexp]: `${search.split(' ').join('|')}` }, status: Status.verified }
        privatFields = DestinationPrivateFields.getAllTraveler
    } else {
        option = { name: { [Op.regexp]: `${search.split(' ').join('|')}` } }
    }
    const destinations = await Destination.findAll({
        where: option,
        attributes: { exclude: privatFields },
        include: [
            { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
            { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: { exclude: [] } }
        ],
        order: [['name', 'ASC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT,
    });
    const count = await Destination.count({ where: option })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { destinations }
    )
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

export const queryDestination = catchAsync(async (req, res, next) => {
    const catalog = req.query.catalog as string;
    const destinations = await Destination.findAll({
        attributes: {
            include: [
                [
                    Sequelize.literal(`(
                    SELECT COUNT(*)
                    FROM catalogs, destination
                    WHERE
                        reaction.postId = post.id
                        AND
                        reaction.type = "Laugh"
                )`),
                    'laughReactionsCount'
                ]
            ]
        }
    });
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { catalog, destinations })
    next()
})

export const getAllDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const roleID = res.locals.user.roleID;
    let option = {}
    let privatFields = DestinationPrivateFields.default
    if (roleID == Roles.Supplier) {
        option = { supplierID: res.locals.user.id }
        privatFields = DestinationPrivateFields.getAllSupplier
    } else if (roleID == Roles.Traveler) {
        option = { status: Status.verified }
        privatFields = DestinationPrivateFields.getAllTraveler

    }
    const destinations = await Destination.findAll(
        {
            where: option,
            attributes: { exclude: privatFields },
            include: [
                { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
                { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: { exclude: [] } }
            ],
            order: [['name', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )
    const count = await Destination.count({ where: option })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { destinations }
    )
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;

    next()
})

export const getOneDestination = catchAsync(async (req, res, next) => {
    const role = res.locals.user.roleID;

    let result = null

    if (role === Roles.Traveler) {
        result = await Destination.findOne({
            where: { id: req.params.id, status: Status.verified },
            attributes: { exclude: DestinationPrivateFields.default },
            include: destinationInclude
        })
    } else if (role === Roles.Supplier) {
        result = await Destination.findOne({
            where: { id: req.params.id, supplierID: res.locals.user.id },
            attributes: { exclude: DestinationPrivateFields.default },
            include: destinationInclude
        })
    } else if (role === Roles["Supplier Manager"]) {
        result = await Destination.findOne({
            where: { id: req.params.id },
            attributes: { exclude: DestinationPrivateFields.default },
            include: destinationInclude
        })
    }
    if (!result || result === null) {
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))
    }
    const personality = await DestinationPersonalites.
        findAll({
            where: { destinationID: result.id },
            attributes: { exclude: ['destinationID'] },
            order: [['visitCount', 'DESC'], ['planCount', 'DESC']]
        })
    const destination = _.omit(result.toJSON(), []);
    destination.catalogs = _.map(destination.catalogs, function (catalog) { return catalog.name; })
    destination.destinationPersonalities = personality
    if (role === Roles.Traveler)
        await Destination.increment({ view: 1 }, { where: { id: destination.id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination })
    next()
})

export const deleteOneDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findByPk(req.params.id)

    if (!destination
        || (res.locals.user.roleID == Roles.Supplier && destination.supplierID != res.locals.user.id)) {
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND))
    }

    await destination.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'success', null)
    next()
})

export const getPendingDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const destinations = await Destination.findAll(
        {
            where: { status: Status.unverified },
            include: destinationInclude,
            order: [['createdAt', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )

    const count = await Destination.count({ where: { status: Status.unverified } })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { destinations }
    )
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;

    next()
})

export const getRejectDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const destinations = await Destination.findAll(
        {
            where: { status: Status.rejected },
            include: destinationInclude,
            order: [['createdAt', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )

    const count = await Destination.count({ where: { status: Status.rejected } })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { destinations }
    )
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;

    next()
})

export const approveDestination = catchAsync(async (req, res, next) => {
    const id = req.query.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: { [Op.or]: [Status.unverified, Status.rejected] } } })

    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    destination.status = Status.verified;
    await destination.save();
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Địa điểm đã được phê duyệt")
    next()
})

export const rejectDestination = catchAsync(async (req, res, next) => {
    const id = req.query.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: Status.unverified } })

    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    destination.status = Status.rejected;
    await destination.save();
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Địa điểm đã bị từ chối")
    next()
})

export const closeDestination = catchAsync(async (req, res, next) => {
    const id = req.query.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: Status.verified } })

    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    destination.status = Status.closed;
    await destination.save();
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Đóng cửa địa điểm thành công")
    next()
})

const validate = async (body: any, supplierID: string) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, catalogs
    } = body;

    if (supplierID == null || supplierID == '')
        return 'Vui lòng nhập ID của đối tác'
    const images = body.images as DestinationImage[]

    if (!name || name === '' || name === null)
        return 'Vui lòng nhập tên địa điểm'

    if (!address || address === '' || address === null)
        return 'Vui lòng nhập địa chỉ địa điểm'

    if (!phone || phone === '' || phone === null)
        return 'Vui lòng nhập số điện thoại địa điểm'

    if (!email || email === '' || email === null)
        return 'Vui lòng nhập email địa điểm'

    if (!description || description === '' || description === null)
        return 'Vui lòng nhập mô tả địa điểm'

    if (!catalogs || catalogs === '' || catalogs === null || catalogs.length === 0)
        return 'Vui lòng nhập loại địa điểm'

    if (!images || images === null || images.length === 0)
        return 'Vui lòng thêm ảnh vào địa điểm'

    if (longitude != null && (typeof longitude !== 'number' || longitude < -180 || longitude > 180))
        return 'Kinh độ không hợp lệ'

    if (latitude != null && (typeof latitude !== 'number' || latitude < -90 || latitude > 90))
        return 'Vĩ độ không hợp lệ'

    if (typeof highestPrice !== 'number' || highestPrice < lowestPrice)
        return 'Giá cao nhất không hợp lệ'

    if (typeof lowestPrice !== 'number')
        return 'Giá thấp nhất không hợp lệ'

    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g

    if (!openingTime.match(regex))
        return 'Giờ mở cửa không hợp lệ'

    if (!closingTime.match(regex) || closingTime <= openingTime)
        return 'Giờ đóng cửa không hợp lệ'
    const count = await Destination.count({ where: { email: email, supplierID: { [Op.ne]: supplierID } } })
    if (count > 0)
        return 'Email đã được sử dụng bởi địa điểm của đối tác khác'

    return null
}

const destinationInclude = [
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: { exclude: ['id'] } },
    { model: DestinationRecommendedTime, as: 'recommendedTimes', attributes: { exclude: ['destinationID', 'id'] } },
    { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
    { model: User, as: 'supplier', attributes: { exclude: UserPrivateFields[Roles.Supplier] } }
]
