import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { DestinationRecommendedTime } from "../../models/destination_recommended_time.model";
import { listStatusDestination, Roles, Status } from "../../utils/constant";
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
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities, recommendedTimes
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
        for (let i = 0; i < recommendedTimes.length; i++) {
            await destination.createRecommendedTime(recommendedTimes[i], { transaction: create })
        }
        for (let i = 0; i < images.length; i++) {
            await destination.createImage(images[i], { transaction: create })
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo địa điểm thành công', { destination: result })
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
        openingTime, closingTime, catalogs, estimatedTimeStay, status
    } = req.body;

    const images = req.body.images as DestinationImage[]

    if (res.locals.user.roleID == Roles["Supplier Manager"]) {
        const { longitude, latitude } = req.body;
        destination.longitude = longitude
        destination.latitude = latitude
    }

    destination.name = name
    destination.address = address
    destination.phone = phone
    destination.email = email
    destination.description = description
    destination.lowestPrice = lowestPrice
    destination.highestPrice = highestPrice
    destination.openingTime = openingTime
    destination.closingTime = closingTime
    estimatedTimeStay ? destination.estimatedTimeStay = estimatedTimeStay : 0
    destination.status = status

    const result = await sequelizeConnection.transaction(async (update) => {
        await destination.save({ transaction: update })
        await destination.setCatalogs(catalogs, { transaction: update })
        await DestinationImage.destroy({ where: { destinationID: destination.id }, transaction: update })
        for (let i = 0; i < images.length; i++) {
            await destination.createImage(images[i], { transaction: update })
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật địa điểm thành công', { destination: result })
    next()
})

export const searchDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const name = req.query.name as string ?? '';
    const catalog = req.query.catalog as string;
    const catalogQuery = `WHERE desCata."catalogName" IN (SELECT "name"
        FROM public."Catalogs" as cata
        WHERE cata."name" = '${catalog}'
        OR cata."parent" = '${catalog}')`
    const destinations = await Destination.findAll({
        where: {
            name: { [Op.iLike]: `%${name}%` },
            status: Status.activated,
            id: {
                [Op.in]: Sequelize.literal(`(
                    SELECT "destinationID"
                    FROM public."DestinationCatalogs" as desCata
                    ${catalog ? catalogQuery : ''}
            )`)
            }
        },
        attributes: { exclude: DestinationPrivateFields.getAllTraveler },
        include: defaultInclude,
        order: [['name', 'ASC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT,
    })

    const count = await Destination.count({
        where: {
            name: { [Op.iLike]: `%${name}%` },
            status: Status.activated,
            id: {
                [Op.in]: Sequelize.literal(`(
                    SELECT "destinationID"
                    FROM public."DestinationCatalogs" as desCata
                    ${catalog ? catalogQuery : ''}
            )`)
            }
        }
    })
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

export const getAllDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const roleID = res.locals.user.roleID;
    let option = {}
    let privatFields = DestinationPrivateFields.default
    if (roleID == Roles.Supplier) {
        option = { supplierID: res.locals.user.id }
        privatFields = DestinationPrivateFields.getAllSupplier
    } else if (roleID == Roles.Traveler) {
        option = { status: Status.activated }
        privatFields = DestinationPrivateFields.getAllTraveler

    }
    const destinations = await Destination.findAll(
        {
            where: option,
            attributes: { exclude: privatFields },
            include: defaultInclude,
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
            where: { id: req.params.id, status: Status.activated },
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

const validate = async (body: any, supplierID: string) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, catalogs, estimatedTimeStay, recommendedTimes, status
    } = body;

    if (!listStatusDestination.includes(status))
        return 'Trạng thái không hợp lệ'

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

    if (!recommendedTimes || recommendedTimes === null || recommendedTimes.length === 0)
        return 'Vui lòng thêm khung giờ lý tưởng vào địa điểm'

    if (longitude != null && (typeof longitude !== 'number' || longitude < -180 || longitude > 180))
        return 'Kinh độ không hợp lệ'

    if (latitude != null && (typeof latitude !== 'number' || latitude < -90 || latitude > 90))
        return 'Vĩ độ không hợp lệ'

    if (typeof highestPrice !== 'number' || highestPrice < lowestPrice)
        return 'Giá cao nhất không hợp lệ'

    if (typeof lowestPrice !== 'number')
        return 'Giá thấp nhất không hợp lệ'

    if (typeof estimatedTimeStay !== 'number' || estimatedTimeStay < 0)
        return 'Thời gian ở lại không hợp lệ'

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
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: ['name'] },
    { model: DestinationRecommendedTime, as: 'recommendedTimes', attributes: { exclude: ['destinationID', 'id'] } },
    { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
    { model: User, as: 'supplier', attributes: { exclude: UserPrivateFields[Roles.Supplier] } }
]

const defaultInclude = [
    { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: ['name'] }
]