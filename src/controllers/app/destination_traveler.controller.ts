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
import _ from "lodash"
import { Op, Sequelize } from "sequelize";
import { User } from "../../models/user.model";
import { DestinationBookmark } from "../../models/destination_bookmark.model";

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
            status: Status.verified,
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
            status: Status.verified,
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
        option = { status: Status.verified }
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
    destination.destinationPersonalities = personality
    if (role === Roles.Traveler)
        await Destination.increment({ view: 1 }, { where: { id: destination.id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination })
    next()
})

export const bookmarkDestination = catchAsync(async (req, res, next) => {
    const id = req.query.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: Status.verified } })
    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const [bookmark, created] = await DestinationBookmark.findOrCreate({ where: { destinationID: destination.id, travelerID: res.locals.user.id } })
    if (created) {
        res.resDocument = new RESDocument(StatusCodes.OK, 'Đã thêm địa điểm vào mục yêu thích', null)
    } else {
        bookmark.isBookmark = bookmark.isBookmark === true ? false : true
        await bookmark.save()
        if (bookmark.isBookmark) {
            res.resDocument = new RESDocument(StatusCodes.OK, 'Đã thêm địa điểm vào mục yêu thích', null)
        } else {
            res.resDocument = new RESDocument(StatusCodes.OK, 'Đã xóa địa điểm khỏi mục yêu thích', null)
        }
    }
    next()
})

export const getBookmarkDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const destinations = await Destination.findAll({
        where: {
            id: {
                [Op.in]: Sequelize.literal(`(
                SELECT "destinationID"
                FROM public."DestinationBookmarks" AS bookmark
                WHERE
                    bookmark."isBookmark" = true
                    AND
                    bookmark."travelerID" = '${res.locals.user.id}'
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
            id: {
                [Op.in]: Sequelize.literal(`(
                SELECT "destinationID"
                FROM public."DestinationBookmarks" AS bookmark
                WHERE
                    bookmark."isBookmark" = true
                    AND
                    bookmark."travelerID" = '${res.locals.user.id}'
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

const defaultInclude = [
    { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: ['name'] }
]

const destinationInclude = [
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: ['name'] },
    { model: DestinationRecommendedTime, as: 'recommendedTimes', attributes: { exclude: ['destinationID', 'id'] } },
    { model: DestinationImage, as: 'images', attributes: { exclude: ['destinationID', 'id'] } },
    { model: User, as: 'supplier', attributes: { exclude: UserPrivateFields[Roles.Supplier] } }
]
