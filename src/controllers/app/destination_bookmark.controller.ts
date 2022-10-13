import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields } from "../../utils/private_field";
import _ from "lodash"
import { Op, Sequelize } from "sequelize";
import { DestinationBookmark } from "../../models/destination_bookmark.model";
import { DestinationImage } from "../../models/destination_image.model";
import { Catalog } from "../../models/catalog.model";

export const bookmarkDestination = catchAsync(async (req, res, next) => {
    const id = req.params.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: Status.activated } })
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