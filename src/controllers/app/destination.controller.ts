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
import { omit } from "lodash";

export const createDestination = catchAsync(async (req, res, next) => {
    const error = validate(req.body);
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : req.body.supplierID;
    const createdBy = res.locals.user.id;

    const destination = await Destination.create({
        name: name, address: address, phone: phone, email: email, description: description,
        longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice,
        openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay, supplierID: supplierID, createdBy: createdBy
    });

    try {
        await destination.addCatalogs(catalogs);
        await destination.addTravelPersonalityTypes(destinationPersonalities);
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
        if (error.parent && (error.parent.detail as string).includes('personalityName')) {
            const personalityName = (error.parent.detail as string).split('(')[2].split(')')[0];
            return next(new AppError(`Tính cách du lịch "${personalityName}" không tồn tại`, StatusCodes.BAD_REQUEST))
        }
        if (error.parent && (error.parent.detail as string).includes('catalogName')) {
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

    const error = validate(req.body);
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = req.body;

    const recommendedTimes = req.body.recommendedTimes as Destination_RecommendedTime[]
    const images = req.body.images as Destination_Image[]


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
    await destination.setTravelPersonalityTypes(destinationPersonalities);

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
                { model: TravelPersonalityType, as: 'destinationPersonalities', through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, as: 'recommendedTimes', attributes: { exclude: ['destinationID', 'id'] } },
                { model: Destination_Image, as: 'images', attributes: { exclude: ['destinationID', 'id'] } }
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

const validate = (body: any) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = body;
    const images = body.images as Destination_Image[]
    const recommendedTimes = body.recommendedTimes as Destination_RecommendedTime[]

    if (!name || name === '' || name === null)
        return 'Tên địa điểm không được trống'

    if (!address || address === '' || address === null)
        return 'Địa chỉ địa điểm không được trống'

    if (!phone || phone === '' || phone === null)
        return 'Địa chỉ địa điểm không được trống'

    if (!email || email === '' || email === null)
        return 'Email địa điểm không được trống'

    if (!description || description === '' || description === null)
        return 'Mô tả địa điểm không được trống'

    if (!catalogs || catalogs === '' || catalogs === null || catalogs.length === 0)
        return 'Danh mục địa điểm không được trống'

    if (!destinationPersonalities || destinationPersonalities === '' || destinationPersonalities === null || destinationPersonalities.length === 0)
        return 'Tính cách du lịch không được trống'

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