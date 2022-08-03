import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import { TravelPersonalityType } from "../../models/personalityType.model";
import { Destination_RecommendedTime } from "../../models/destination_recommendedTime.model";
import lodash from "lodash";

export const create = catchAsync(async (req, res, next) => {
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

    // const destination = new Destination();
    // destination.name = name;
    // destination.address = address;
    // destination.longitude = longitude;
    // destination.latitude = latitude;
    // destination.phone = phone;
    // destination.email = email;
    // destination.supplierID = supplier;
    // destination.description = description;
    // destination.lowestPrice = lowestPrice;
    // destination.highestPrice = highestPrice;
    // destination.openingTime = openingTime;
    // destination.closingTime = closingTime;
    // destination.estimatedTimeStay = estimatedTimeStay;
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
        return next(new AppError('Thời gian đề xuất không hợp lệ', StatusCodes.BAD_REQUEST))

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
            })

    const result = await Destination.findOne({ where: { id: destination.id }, include: [TravelPersonalityType, Catalog, Destination_RecommendedTime] })
    const document = lodash.omit(result?.toJSON(), ["TravelPersonalityTypes.Destination_TravelPersonalityType", "Destination_Catalog", "destinationID"])
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', document);
    next();
});