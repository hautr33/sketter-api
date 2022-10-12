import { StatusCodes } from "http-status-codes"
import { Op } from "sequelize"
import sequelizeConnection from "../../db/sequelize.db"
import { Destination } from "../../models/destination.model"
import { DestinationRating } from "../../models/destination_rating.model"
import AppError from "../../utils/app_error"
import catch_async from "../../utils/catch_async"
import RESDocument from "../factory/res_document"

export const ratingDestination = catch_async(async (req, res, next) => {
    const { star, description } = req.body

    const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
    if (count === 1)
        return next(new AppError('Không thể đánh giá địa điểm đã đánh giá', StatusCodes.BAD_REQUEST))

    if (!star || typeof star !== 'number' || star < 1 || star > 5)
        return next(new AppError('Số sao không hợp lệ', StatusCodes.BAD_REQUEST))
    await sequelizeConnection.transaction(async (create) => {
        await DestinationRating.create({ destinationID: req.params.id, userID: res.locals.user.id, star: star, description: description },
            { transaction: create })
        const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: create })
        const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: create })
        await Destination.update({ avgRating: count ? sum / count : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: create })
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Đánh giá địa điểm thành công', null)
    next()
})

export const updateRating = catch_async(async (req, res, next) => {
    const { star, description } = req.body

    const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
    if (count !== 1)
        return next(new AppError('Không tìm thấy đánh giá này', StatusCodes.NOT_FOUND))

    if (!star || typeof star !== 'number' || star < 1 || star > 5)
        return next(new AppError('Số sao không hợp lệ', StatusCodes.BAD_REQUEST))

    await DestinationRating.update({ star: star, description: description }, { where: { destinationID: req.params.id, userID: res.locals.user.id } })
    await sequelizeConnection.transaction(async (update) => {
        await DestinationRating.update({ star: star, description: description }, {
            where: { destinationID: req.params.id, userID: res.locals.user.id },
            transaction: update
        })
        const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: update })
        const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: update })
        await Destination.update({ avgRating: count ? sum / count : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: update })
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Chỉnh sửa đánh giá thành công', null)
    next()
})

export const deleteRating = catch_async(async (req, res, next) => {
    const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
    if (count !== 1)
        return next(new AppError('Không tìm thấy đánh giá này', StatusCodes.NOT_FOUND))

    await DestinationRating.destroy({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
    await sequelizeConnection.transaction(async (update) => {
        await DestinationRating.destroy({ where: { destinationID: req.params.id, userID: res.locals.user.id }, transaction: update })
        const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: update })
        const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: update })
        await Destination.update({ avgRating: count ? sum / count : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: update })
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Đánh giá của bạn đã được xoá', null)
    next()
})

export const getAllRating = catch_async(async (req, res, next) => {
    const rating = await Destination.findOne({
        where: { id: req.params.id },
        attributes: ['avgRating', 'totalRating']
    })

    if (!rating)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const otherRating = await DestinationRating.findAll({
        where: { destinationID: req.params.id, userID: { [Op.ne]: res.locals.user.id } },
        attributes: ['userID', 'star', 'description']
    })

    const myRating = await DestinationRating.findOne({
        where: { destinationID: req.params.id, userID: res.locals.user.id },
        attributes: ['userID', 'star', 'description']
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', {
        'avgRating': rating.avgRating,
        'totalRating': rating.totalRating,
        'myRating': myRating,
        'otherRating': otherRating
    })
    next()
})