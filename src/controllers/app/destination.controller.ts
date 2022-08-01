import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import { TravelPersonalityType } from "../../models/personalityType.model";

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


    let listCatalog: Catalog[] = [];
    for (let i = 0; i < catalogs.length; i++) {
        const catalog = await Catalog.findOne(catalogs[i].name)
        if (!catalog)
            return next(new AppError('Loại hình địa điểm không hợp lệ', StatusCodes.BAD_REQUEST))
        listCatalog.push(catalog);
    }


    let listpersonalityType: TravelPersonalityType[] = [];
    for (let i = 0; i < personalityTypes.length; i++) {
        const personalityType = await TravelPersonalityType.findOne(personalityTypes[i].name)
        if (!personalityType)
            return next(new AppError('Tính cách du lịch của địa điểm không hợp lệ', StatusCodes.BAD_REQUEST))
        listpersonalityType.push(personalityType);
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
        estimatedTimeStay: estimatedTimeStay
    });

    for (let i = 1; i <= recommendedTimes.length; i++) {
        const catalog = await Catalog.findByPk(i);
        if (catalog)
            await destination.addCatalog(catalog);
    }

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', {
        destination: destination,
        recommendedTime: recommendedTimes.length,
        personalityType: personalityTypes.length,
        catalog: catalogs.length
    });
    next();
});