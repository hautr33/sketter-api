import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import { TravelPersonalityType } from "../../models/personalityType.model";
import { Destination_RecommendedTime } from "../../models/destination_recommendedTime.model";
import { Roles, Status } from "../../utils/constant";
import { DESTINATION_IMG_URL, PAGE_LIMIT } from "../../config/default";
import { DestinationPrivateFields } from "../../utils/privateField";
import { UploadedFile } from "express-fileupload";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { Destination_Image } from "../../models/destination_image.model";
import { deleteOne } from "../factory/crud.factory";
import { validateDestination } from "../../utils/validateInput";
import sharp from "sharp";

export const createDestination = catchAsync(async (req, res, next) => {
    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay
    } = req.body;

    const catalogs = JSON.parse(req.body.catalogs)
    const personalityTypes = JSON.parse(req.body.personalityTypes)
    const recommendedTimes = JSON.parse(req.body.recommendedTimes)
    const supplierID = res.locals.user.id;

    const error = await validateDestination(lowestPrice, highestPrice, openingTime, closingTime, catalogs, personalityTypes, recommendedTimes)
    if (error) {
        return next(new AppError(error, StatusCodes.BAD_REQUEST))
    }

    let listCatalog: Catalog[] = [];
    for (let i = 0; i < catalogs.length; i++) {
        const catalog = await Catalog.findOne({ where: { name: catalogs[i].name } })
        if (catalog)
            listCatalog.push(catalog);
    }

    let listpersonalityType: TravelPersonalityType[] = [];
    for (let i = 0; i < personalityTypes.length; i++) {
        const personalityType = await TravelPersonalityType.findOne({ where: { name: personalityTypes[i].name } })
        if (personalityType)
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
        estimatedTimeStay: estimatedTimeStay,
        supplierID: supplierID
    });

    await destination.addCatalogs(listCatalog);
    await destination.addTravelPersonalityTypes(listpersonalityType);
    for (let i = 0; i < recommendedTimes.length; i++)
        await Destination_RecommendedTime.create({
            destinationID: destination.id,
            start: recommendedTimes[i].start,
            end: recommendedTimes[i].end
        })

    if (req.files && req.files.images) {

        if (req.files.images as UploadedFile) {
            let temp = JSON.stringify(req.files.images);
            if (!temp.startsWith('[')) {
                temp = '[' + temp + ']'
                req.files.images = JSON.parse(temp)
            }

            const images = req.files.images as UploadedFile[];
            images.forEach(async img => {
                if (img.mimetype.includes('image')) {
                    const storage = getStorage();
                    const image = `${DESTINATION_IMG_URL}/${destination.id}/${Date.now()}.jpeg`;
                    const storageRef = ref(storage, image);
                    const metadata = {
                        contentType: 'image/jpeg',
                    };
                    const bytes = new Uint8Array(img.data);
                    sharp(bytes)
                        .resize(1080, 720)
                        .toFormat("jpeg", { mozjpeg: true })
                        .toBuffer()
                        .then(async data => {
                            await uploadBytes(storageRef, data, metadata)
                                .then(async (snapshot) => {
                                    await getDownloadURL(ref(storage, snapshot.metadata.fullPath)).then(async (url) => {
                                        const imgURL = url.split('&token')[0]
                                        await Destination_Image.create({
                                            destinationID: destination.id,
                                            imgURL: imgURL
                                        })
                                    })
                                })
                                .catch(() => {
                                    destination.destroy();
                                    return next(new AppError('Có lỗi xảy ra khi upload ảnh', StatusCodes.BAD_GATEWAY))
                                })
                        })
                        .catch(() => {
                            destination.destroy();
                            return next(new AppError('Có lỗi xảy ra khi upload ảnh', StatusCodes.BAD_GATEWAY))
                        })

                } else {
                    destination.destroy();
                    return next(new AppError('Ảnh không hợp lệ', StatusCodes.BAD_REQUEST))
                }
            });
            const result = await Destination.findOne({
                where: { id: destination.id },
                attributes: { exclude: ['updatedAt', 'deletedAt'] }
            })
            res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
            next();
        } else {
            destination.destroy();
            return next(new AppError('Có lỗi xảy ra khi upload ảnh', StatusCodes.BAD_REQUEST))
        }
    }
});

export const updateDestination = catchAsync(async (req, res, next) => {
    const destination = await Destination.findOne({ where: { id: req.params.id } });
    if (!destination)
        return next(new AppError('Không tìm thấy thông tin với ID này', StatusCodes.NOT_FOUND));

    const { name, address, longitude, latitude, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay
    } = req.body;

    const catalogs = JSON.parse(req.body.catalogs)
    const personalityTypes = JSON.parse(req.body.personalityTypes)
    const recommendedTimes = JSON.parse(req.body.recommendedTimes)
    const supplierID = res.locals.user.id;

    const error = await validateDestination(lowestPrice, highestPrice, openingTime, closingTime, catalogs, personalityTypes, recommendedTimes)
    if (error) {
        return next(new AppError(error, StatusCodes.BAD_REQUEST))
    }

    let newCatalogs: Catalog[] = [];
    for (let i = 0; i < catalogs.length; i++) {
        const catalog = await Catalog.findOne({ where: { name: catalogs[i].name } })
        if (catalog)
            newCatalogs.push(catalog);
    }

    let newPersonalityTypes: TravelPersonalityType[] = [];
    for (let i = 0; i < personalityTypes.length; i++) {
        const personalityType = await TravelPersonalityType.findOne({ where: { name: personalityTypes[i].name } })
        if (personalityType)
            newPersonalityTypes.push(personalityType);
    }
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

    const curCatalogs = await destination.getCatalogs();
    await destination.removeCatalogs(curCatalogs);
    await destination.addCatalogs(newCatalogs);

    const curPersonalityTypes = await destination.getTravelPersonalityTypes();
    await destination.removeTravelPersonalityTypes(curPersonalityTypes);
    await destination.addTravelPersonalityTypes(newPersonalityTypes);

    await Destination_RecommendedTime.destroy({ where: { destinationID: destination.id } })
    for (let i = 0; i < recommendedTimes.length; i++)
        await Destination_RecommendedTime.create({
            destinationID: destination.id,
            start: recommendedTimes[i].start,
            end: recommendedTimes[i].end
        })
    const result = await Destination.findOne({
        where: { id: destination.id },
        attributes: { exclude: ['updatedAt', 'deletedAt'] },
        include: [
            { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
            { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
            { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID'] } },
            { model: Destination_Image, attributes: { exclude: ['destinationID'] } }
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
            attributes: { exclude: ['updatedAt', 'createdAt'] },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Catalog, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                { model: Destination_RecommendedTime, attributes: { exclude: ['destinationID'] } },
                { model: Destination_Image, attributes: { exclude: ['destinationID'] } }
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