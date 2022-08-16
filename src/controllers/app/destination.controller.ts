import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import { TravelPersonalityType } from "../../models/personalityType.model";
import { Destination_RecommendedTime } from "../../models/destination_recommendedTime.model";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields } from "../../utils/privateField";
import { Destination_Image } from "../../models/destination_image.model";
import { deleteOne } from "../factory/crud.factory";
import { validateDestination } from "../../utils/validateInput";
import { omit } from "lodash";

export const createDestination = catchAsync(async (req, res, next) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, personalityTypes
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]
    const supplierID = res.locals.user.id;

    const error = validateDestination(lowestPrice, highestPrice, openingTime, closingTime, catalogs, personalityTypes, recommendedTimes)
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const destination = await Destination.create({
        name: name, address: address, phone: phone, email: email, description: description,
        longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice,
        openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay, supplierID: supplierID,
    });

    await destination.addCatalogs(catalogs);
    await destination.addTravelPersonalityTypes(personalityTypes);
    recommendedTimes.forEach(async time => {
        await destination.createDestination_RecommendedTime(time);
    });
    images.forEach(async img => {
        await destination.createDestination_Image(img);
    });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', omit(destination.toJSON(), DestinationPrivateFields.default));
    next();
});

export const updateDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id } });
    if (!destination)
        return next(new AppError('Không tìm thấy thông tin với ID này', StatusCodes.NOT_FOUND));

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, personalityTypes
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]
    const supplierID = res.locals.user.id;

    const error = validateDestination(lowestPrice, highestPrice, openingTime, closingTime, catalogs, personalityTypes, recommendedTimes)
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    await Destination.update(
        {
            name: name,
            address: address,
            phone: phone,
            email: email,
            description: description,
            longitude: longitude,
            latitude: latitude,
            lowestPrice: lowestPrice,
            highestPrice: highestPrice,
            openingTime: openingTime,
            closingTime: closingTime,
            estimatedTimeStay: estimatedTimeStay,
            supplierID: supplierID
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

    const result = await Destination.findOne({
        where: { id: destination.id },
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
    const page = Number(req.query.page ?? 1);
    if (isNaN(page) || page < 1)
        return next(new AppError('Trang không hợp lệ', StatusCodes.BAD_REQUEST))

    const roleID = res.locals.user.roleID;
    let option;
    if (roleID == Roles.Traveler) {
        option = { status: "Verified" }
    } else if (roleID == Roles.Supplier) {
        const id = res.locals.user.id;
        option = { supplierID: id }
    } else {
        option = {};
    }
    const { count, rows } = await Destination.findAndCountAll(
        {
            where: option,
            attributes: { exclude: DestinationPrivateFields.default },
            order: [['name', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT
        });

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        rows
    );
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT);
        if (page > maxPage)
            return next(new AppError('Trang không hợp lệ', StatusCodes.BAD_REQUEST))
        resDocument.setCurrentPage(page);
        resDocument.setMaxPage(maxPage);
    }
    res.resDocument = resDocument;

    next();
});

export const getOneDestination = catchAsync(async (req, res, next) => {
    const roleID = res.locals.user.roleID;
    const id = res.locals.user.id;
    let option: any = { id: req.params.id };
    if (roleID == Roles.Supplier) {
        option = { id: req.params.id, supplierID: id }
    }
    if (roleID == Roles.Traveler) {
        option = { id: req.params.id, status: Status.verified }
    }
    const document = await Destination.findOne(
        {
            where: option,
            attributes: { exclude: DestinationPrivateFields.default },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID', 'id'] } },
                { model: Destination_Image, attributes: { exclude: ['destinationID', 'id'] } }
            ]
        });
    if (!document) {
        return next(
            new AppError(
                'Không tìm thấy thông tin với ID này',
                StatusCodes.NOT_FOUND
            )
        );
    }
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', document);

    next();
})

export const deleteDestination = deleteOne(Destination);