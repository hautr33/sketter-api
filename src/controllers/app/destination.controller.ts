import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import { TravelPersonalityType } from "../../models/personalityType.model";
import { Destination_RecommendedTime, validateRecommendedTime } from "../../models/destination_recommendedTime.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields } from "../../utils/privateField";
import { Destination_Image } from "../../models/destination_image.model";
import { omit } from "lodash";

export const createDestination = catchAsync(async (req, res, next) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, personalityTypes
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : req.body.supplierID;
    const createdBy = res.locals.user.id;

    if (!catalogs || catalogs.length == 0)
        return next(new AppError('Danh mục địa điểm không được trống', StatusCodes.BAD_REQUEST))

    if (!personalityTypes || personalityTypes.length == 0)
        return next(new AppError('Tính cách du lịch không được trống', StatusCodes.BAD_REQUEST))

    if (!images || images.length == 0)
        return next(new AppError('Ảnh địa điểm không được trống', StatusCodes.BAD_REQUEST))

    const err = validateRecommendedTime(recommendedTimes)
    if (err.length > 0)
        return next(new AppError(err, StatusCodes.BAD_REQUEST))

    const destination = await Destination.create({
        name: name, address: address, phone: phone, email: email, description: description,
        longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice,
        openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay, supplierID: supplierID, createdBy: createdBy
    });

    try {
        await destination.addCatalogs(catalogs);
        await destination.addTravelPersonalityTypes(personalityTypes);
        recommendedTimes.forEach(async time => {
            await destination.createDestination_RecommendedTime(time)
        });
        images.forEach(async img => {
            await destination.createDestination_Image(img)
        });

        res.resDocument = new RESDocument(StatusCodes.OK, 'success', omit(destination.toJSON(), DestinationPrivateFields.default));
        next();
    } catch (error: any) {
        destination.destroy({ force: true })
        if ((error.parent && error.parent.detail as string).includes('personalityName')) {
            const personalityName = (error.parent.detail as string).split('(')[2].split(')')[0];
            return next(new AppError(`Tính cách du lịch "${personalityName}" không tồn tại`, StatusCodes.BAD_REQUEST))
        }
        if ((error.parent && error.parent.detail as string).includes('catalogName')) {
            const catalogName = (error.parent.detail as string).split('(')[2].split(')')[0];
            return next(new AppError(`Danh mục địa điểm "${catalogName}" không tồn tại`, StatusCodes.BAD_REQUEST))
        }
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    }

});

export const updateDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id } });
    if (!destination || res.locals.user.roleID != Roles["Supplier Manager"] && destination.supplierID != res.locals.user.id)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, personalityTypes
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]

    if (!catalogs || catalogs.length == 0)
        return next(new AppError('Danh mục địa điểm không được trống', StatusCodes.BAD_REQUEST))

    if (!personalityTypes || personalityTypes.length == 0)
        return next(new AppError('Tính cách du lịch không được trống', StatusCodes.BAD_REQUEST))

    if (!recommendedTimes || recommendedTimes.length == 0)
        return next(new AppError('Khung thời gian đề xuất không được trống', StatusCodes.BAD_REQUEST))

    await Destination.update(
        {
            name: name, address: address, phone: phone, email: email, description: description,
            longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice,
            openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay,
        },
        {
            where: { id: req.params.id }
        }
    );

    await destination.setCatalogs(catalogs);
    await destination.setTravelPersonalityTypes(personalityTypes);

    await Destination_RecommendedTime.destroy({ where: { destinationID: destination.id } })
    recommendedTimes.forEach(async time => {
        await destination.createDestination_RecommendedTime(time);
    });

    await Destination_Image.destroy({ where: { destinationID: destination.id } })
    images.forEach(async img => {
        await destination.createDestination_Image(img);
    });

    const result = await Destination.findByPk(
        destination.id,
        {
            attributes: { exclude: DestinationPrivateFields.default },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID', 'id'] } },
                { model: Destination_Image, attributes: { exclude: ['destinationID', 'id'] } }
            ]
        })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();
})

export const getAllDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page);
    const roleID = res.locals.user.roleID;
    let option = {}
    if (roleID == Roles.Supplier) {
        option = { supplierID: res.locals.user.id }
    }
    const { count, rows } = await Destination.findAndCountAll(
        {
            where: option,
            attributes: { exclude: DestinationPrivateFields.default },
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT
        }
    );
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        rows
    );
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT);
        resDocument.setCurrentPage(page);
        resDocument.setMaxPage(maxPage);
    }
    res.resDocument = resDocument;

    next();
});

export const getOneDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findByPk(
        req.params.id,
        {
            attributes: { exclude: DestinationPrivateFields.default },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID', 'id'] } },
                { model: Destination_Image, attributes: { exclude: ['destinationID', 'id'] } }
            ]
        });


    if (!destination
        || (res.locals.user.roleID == Roles.Supplier && destination.supplierID != res.locals.user.id)
        || (res.locals.user.roleID == Roles.Traveler && destination.status != Status.verified)) {
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));
    }
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', destination);
    next();
})

export const deleteOneDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findByPk(req.params.id);

    if (!destination
        || (res.locals.user.roleID == Roles.Supplier && destination.supplierID != res.locals.user.id)) {
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));
    }

    await destination.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'deleted', null);
    next();
})
