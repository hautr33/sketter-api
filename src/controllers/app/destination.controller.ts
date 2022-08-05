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

export const createDestination = catchAsync(async (req, res, next) => {
    const {
        name,
        address,
        longitude,
        latitude,
        phone,
        email,
        description,
        lowestPrice,
        highestPrice,
        openingTime,
        closingTime,
        estimatedTimeStay,
        recommendedTimes,
        personalityTypes,
        catalogs
    } = req.body;

    if (lowestPrice >= highestPrice) {
        return next(new AppError('Giá thấp nhất và giá cao nhất không hợp lệ', StatusCodes.BAD_REQUEST))
    }
    if (openingTime >= closingTime) {
        return next(new AppError('Giờ mở cửa và giờ đóng cửa không hợp lệ', StatusCodes.BAD_REQUEST))
    }
    const supplierID = res.locals.user.id;

    let listCatalog: Catalog[] = [];
    for (let i = 0; i < catalogs.length; i++) {
        const catalog = await Catalog.findOne({ where: { name: catalogs[i].name } })
        if (!catalog)
            return next(new AppError('Loại hình địa điểm không hợp lệ', StatusCodes.BAD_REQUEST))
        listCatalog.push(catalog);
    }

    let listpersonalityType: TravelPersonalityType[] = [];
    for (let i = 0; i < personalityTypes.length; i++) {
        const personalityType = await TravelPersonalityType.findOne({ where: { name: personalityTypes[i].name } })
        if (!personalityType)
            return next(new AppError('Tính cách du lịch của địa điểm không hợp lệ', StatusCodes.BAD_REQUEST))
        listpersonalityType.push(personalityType);
    }


    if (recommendedTimes.length < 1)
        return next(new AppError('Khung thời gian đề xuất không được trống', StatusCodes.BAD_REQUEST))

    for (let i = 0; i < recommendedTimes.length; i++) {
        if (recommendedTimes[i].start >= recommendedTimes[i].end) {
            return next(new AppError(`Khung thời gian đề xuất ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST))
        }
        for (let j = i + 1; j < recommendedTimes.length; j++) {
            if (recommendedTimes[i].start <= recommendedTimes[j].start
                && recommendedTimes[j].start <= recommendedTimes[i].end
                || recommendedTimes[i].start <= recommendedTimes[j].end
                && recommendedTimes[j].end <= recommendedTimes[i].end) {
                return next(new AppError(`Khung thời gian đề xuất ${i + 1} và ${j + 1} bị xung đột`, StatusCodes.BAD_REQUEST))
            }
        }
    }
    const destination = await Destination.create({
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
    });

    for (let i = 0; i < listCatalog.length; i++)
        await destination.addCatalog(listCatalog[i]);

    for (let i = 0; i < listpersonalityType.length; i++)
        await destination.addTravelPersonalityType(listpersonalityType[i]);

    if (destination.id)
        for (let i = 0; i < recommendedTimes.length; i++)
            await Destination_RecommendedTime.create({
                destinationID: destination.id,
                start: recommendedTimes[i].start,
                end: recommendedTimes[i].end
            }).catch((e) => {
                destination.destroy();
                const msg = e.message;
                if (msg.includes('Validation error: ')) {
                    const message = msg.split('Validation error: ')[1];
                    return next(new AppError(message, StatusCodes.BAD_REQUEST))
                } else {
                    return next(new AppError(msg, StatusCodes.BAD_REQUEST))
                }
            })

    const result = await Destination.findOne({
        where: { id: destination.id }, attributes: { exclude: ['updatedAt', 'createdAt'] },
        include: [
            { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
            { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
            { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID'] } }
        ]
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();
});

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

// export const getOneDestination = getOne(
//     Destination,
//     {
// attributes: { exclude: ['updatedAt', 'createdAt'] },
// include: [
//     { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
//     { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
//     { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID'] }, }
// ]
//     });


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
            attributes: { exclude: ['updatedAt', 'createdAt'] },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID'] }, }
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