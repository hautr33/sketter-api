import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { TravelPersonalityType } from "../../models/personality_type.model";
import { Destination_RecommendedTime } from "../../models/destination_recommended_time.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields } from "../../utils/private_field";
import { Destination_Image } from "../../models/destination_image.model";
import sequelizeConnection from "../../db/sequelize.db";
import _ from "lodash"

export const createDestination = catchAsync(async (req, res, next) => {
    const error = validate(req.body)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : req.body.supplierID;
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

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination: result })
    next()
})

export const updateDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id } })
    if (!destination || res.locals.user.roleID != Roles["Supplier Manager"] && destination.supplierID != res.locals.user.id)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const error = validate(req.body)
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]

    destination.name = name
    destination.address = address
    destination.phone = phone
    destination.email = email
    destination.description = description
    destination.longitude = longitude
    destination.latitude = latitude
    destination.lowestPrice = lowestPrice
    destination.highestPrice = highestPrice
    destination.openingTime = openingTime
    destination.closingTime = closingTime
    destination.estimatedTimeStay = estimatedTimeStay

    const result = await sequelizeConnection.transaction(async (update) => {
        await destination.save({ transaction: update })
        await destination.setCatalogs(catalogs, { transaction: update })

        await Destination_RecommendedTime.destroy({ where: { destinationID: destination.id }, transaction: update })
        for (let i = 0; i < recommendedTimes.length; i++) {
            await destination.createRecommendedTime(recommendedTimes[i], { transaction: update })
        }

        await Destination_Image.destroy({ where: { destinationID: destination.id }, transaction: update })
        for (let i = 0; i < images.length; i++) {
            await destination.createImage(images[i], { transaction: update })
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination: result })
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
            include: [{ model: Destination_Image, as: 'images', attributes: { exclude: ['destinationID', 'id'] } }],
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
    const destination = _.omit(result.toJSON(), []);
    destination.destinationPersonalities = _.map(destination.destinationPersonalities, function (personality) { return personality.name; })
    destination.catalogs = _.map(destination.catalogs, function (catalog) { return catalog.name; })
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

export const approveDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id, status: Status.unverified } })

    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const { isApprove } = req.body
    let message = ''
    if (typeof isApprove === "boolean" && isApprove) {
        destination.status = Status.verified;
        message = "Địa điểm đã được phê duyệt"
    }
    else {
        destination.status = Status.reject;
        message = "Địa điểm đã bị từ chối"
    }

    await destination.save();
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', message)
    next()
})

const validate = (body: any) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs
    } = body;
    const images = body.images as Destination_Image[]
    const recommendedTimes = body.recommendedTimes as Destination_RecommendedTime[]

    if (!name || name === '' || name === null)
        return 'Tên địa điểm không được trống'

    if (!address || address === '' || address === null)
        return 'Địa chỉ địa điểm không được trống'

    if (!phone || phone === '' || phone === null)
        return 'Số điện thoại không được trống'

    if (!email || email === '' || email === null)
        return 'Email địa điểm không được trống'

    if (!description || description === '' || description === null)
        return 'Mô tả địa điểm không được trống'

    if (!catalogs || catalogs === '' || catalogs === null || catalogs.length === 0)
        return 'Loại địa điểm không được trống'

    if (!images || images === null || images.length === 0)
        return 'Ảnh địa điểm không được trống'

    if (!recommendedTimes || recommendedTimes === null || recommendedTimes.length === 0)
        return 'Khung thời gian đề xuất không được trống'

    if (typeof estimatedTimeStay !== 'number' || estimatedTimeStay < 0)
        return 'Thời gian tham quan dự kiến không hợp lệ'

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180)
        return 'Kinh độ không hợp lệ'

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90)
        return 'Vĩ độ không hợp lệ'

    if (typeof highestPrice !== 'number' || highestPrice < lowestPrice)
        return 'Giá cao nhất không hợp lệ'

    if (typeof lowestPrice !== 'number')
        return 'Giá thấp nhất không hợp lệ'

    if (typeof highestPrice !== 'number' || highestPrice < lowestPrice)
        return 'Giá cao nhất không hợp lệ'

    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g

    if (!openingTime.match(regex))
        return 'Giờ mở cửa không hợp lệ'

    if (!closingTime.match(regex) || closingTime <= openingTime)
        return 'Giờ đóng cửa không hợp lệ'

    for (let i = 0; i < recommendedTimes.length; i++)
        if (!recommendedTimes[i].start.match(regex))
            return `Giờ bắt đầu "${recommendedTimes[i].start}" của khung thời gian đề xuất không hợp lệ. `
        else if (!recommendedTimes[i].end.match(regex) || recommendedTimes[i].end < recommendedTimes[i].start)
            return `Giờ kết thúc "${recommendedTimes[i].end}" của khung thời gian đề xuất không hợp lệ. `

    return null
}

const destinationInclude = [
    { model: TravelPersonalityType, as: 'destinationPersonalities', through: { attributes: [] }, attributes: { exclude: ['id'] } },
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: { exclude: ['id'] } },
    { model: Destination_RecommendedTime, as: 'recommendedTimes', attributes: { exclude: ['destinationID', 'id'] } },
    { model: Destination_Image, as: 'images', attributes: { exclude: ['destinationID', 'id'] } }
]
