import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Personalities } from "../../models/personalities.model";
import { Roles, Status } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash";
import { PlanPrivateFields } from "../../utils/private_field";
import { User } from "../../models/user.model";
import { Op } from "sequelize";
import { DestinationPersonalites } from "../../models/destination_personalities.model";
import { PAGE_LIMIT } from "../../config/default";
import { getDestinationDistanceService } from "../../services/destination.service";
import { Catalog } from "../../models/catalog.model";

export const createPlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    await validate(req.body)
    const { name, fromDate, toDate, isPublic, details } = req.body;
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID

    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id', 'lowestPrice', 'highestPrice'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    const plan = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, stayDestinationID: stayDestinationID, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        let cost = stay ? (stay.lowestPrice + stay.highestPrice) / 2 : 0;
        for (let i = 0; i < details.length; i++) {
            let hh = 8
            let mm = 0
            for (let j = 0; j < details[i].destinations.length; j++) {
                const destination = await Destination.findOne({ where: { id: details[i].destinations[j].destinationID }, attributes: ['lowestPrice', 'highestPrice', 'estimatedTimeStay', 'status'] })
                if (!destination || destination === null)
                    throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)

                if (destination.status !== Status.open)
                    throw new AppError(`Địa điểm '${destination.name}' hiện đang đóng cửa hoặc ngưng hoạt động, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)

                cost += (destination.lowestPrice + destination.highestPrice) / 2
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planID = plan.id;
                planDestination.date = details[i].date;

                if (j !== 0) {
                    const distance = await getDestinationDistanceService(details[i].destinations[j - 1].destinationID, details[i].destinations[j].destinationID, planDestination.profile)
                    if (!distance)
                        throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa 2 địa điểm', StatusCodes.BAD_REQUEST)

                    hh += Math.floor((Math.ceil(distance.duration / 60) + mm) / 60)
                    mm = Math.ceil(distance.duration / 60) + mm - Math.floor((Math.ceil(distance.duration / 60) + mm) / 60) * 60
                    planDestination.distance = distance.distance
                    planDestination.duration = distance.duration
                    planDestination.distanceText = distance.distanceText
                    planDestination.durationText = distance.durationText
                } else {
                    planDestination.distance = 0
                    planDestination.duration = 0
                    planDestination.distanceText = '0m'
                    planDestination.durationText = '0s'
                }
                if (hh == 23 && mm > 1 || hh > 23)
                    throw new AppError('Thời gian không đủ', StatusCodes.BAD_REQUEST)
                const fromTime = details[i].date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                hh += Math.floor((destination.estimatedTimeStay + mm) / 60)
                mm = destination.estimatedTimeStay + mm - Math.floor((destination.estimatedTimeStay + mm) / 60) * 60
                const toTime = details[i].date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                planDestination.fromTime = new Date(fromTime)
                planDestination.toTime = new Date(toTime)

                await planDestination.save({ transaction: create })

                if (!user || !user.travelerPersonalities)
                    throw new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST)

                for (let i = 0; i < user.travelerPersonalities.length; i++) {
                    await DestinationPersonalites.findOrCreate({
                        where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name }
                    })
                    await DestinationPersonalites.
                        increment(
                            { planCount: 1 },
                            { where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name } }
                        )
                }
            }
        }
        await Plan.update({ estimatedCost: cost }, { where: { id: plan.id }, transaction: create })
        return plan
    })

    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne,
            order: [['details', 'fromTime', 'ASC']]
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { plan: result });
    next();
});
export const createSmartPlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    const personalities: string[] = []
    user?.travelerPersonalities?.forEach((personality: { name: string; }) => {
        personalities.push(personality.name)
    });
    if (personalities.length === 0)
        return next(new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST))

    // const { name, fromDate, toDate, cityID, fromPrice, toPrice } = req.body;
    const { cityID } = req.body;
    const des = await Destination.findAll({
        where: { status: Status.open, cityID: cityID },
        attributes: ['id', 'longitude', 'latitude', 'lowestPrice', 'highestPrice', 'openingTime', 'closingTime', 'estimatedTimeStay', 'avgRating', 'view'],
        include: [
            {
                model: Personalities,
                as: 'destinationPersonalities',
                where: {
                    name: {
                        [Op.or]: personalities
                    }
                },
                through: { attributes: ['planCount', 'visitCount'], as: 'count' },
                attributes: []
            },


        ]

    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { count: des.length, des: des, test: personalities });
    next();
})
export const updatePlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await validate(req.body)

    const { name, fromDate, toDate, isPublic, details } = req.body;
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID
    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id', 'lowestPrice', 'highestPrice'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    name ? plan.name = name : 0;
    fromDate ? plan.fromDate = fromDate : 0;
    toDate ? plan.toDate = toDate : 0;
    isPublic ? plan.isPublic = isPublic : 0;

    await sequelizeConnection.transaction(async (update) => {
        await plan.save({ transaction: update });
        await PlanDestination.destroy({ where: { planID: plan.id }, transaction: update })
        let cost = stay ? (stay.lowestPrice + stay.highestPrice) / 2 : 0;

        for (let i = 0; i < details.length; i++) {
            let hh = 0
            let mm = 0
            for (let j = 0; j < details[i].destinations.length; j++) {
                const destination = await Destination.findOne({
                    where: { id: details[i].destinations[j].destinationID }, attributes: ['name', 'lowestPrice', 'highestPrice', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status'],
                    include: [
                        { model: Catalog, as: 'catalogs', where: { name: { [Op.notILike]: '%lưu trú%' }, parent: { [Op.notILike]: '%lưu trú%' } } }
                    ]
                })

                if (!destination || destination === null)
                    throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)

                if (destination.status === Status.closed)
                    throw new AppError(`Địa điểm '${destination.name}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)

                if (destination.status === Status.deactivated)
                    return next(new AppError(`Địa điểm '${destination.name}' đã bị ngưng hoạt động, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST))
                cost += (destination.lowestPrice + destination.highestPrice) / 2
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planID = plan.id;
                planDestination.destinationID = details[i].destinations[j].destinationID;
                planDestination.date = details[i].date;
                planDestination.fromTime = new Date(details[i].destinations[j].fromTime)
                planDestination.toTime = new Date(details[i].destinations[j].toTime)
                if (!(planDestination.fromTime instanceof Date && !isNaN(planDestination.fromTime.getTime())))
                    throw new AppError(`Thời gian đến địa điểm '${destination.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)
                if (!(planDestination.toTime instanceof Date && !isNaN(planDestination.toTime.getTime())))
                    throw new AppError(`Thời gian rời địa điểm '${destination.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

                if (j !== 0) {
                    const distance = await getDestinationDistanceService(details[i].destinations[j - 1].destinationID, details[i].destinations[j].destinationID, planDestination.profile)
                    if (!distance)
                        throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa 2 địa điểm', StatusCodes.BAD_REQUEST)

                    // console.log(Math.ceil(distance.duration / 60));

                    hh += Math.floor((Math.ceil(distance.duration / 60) + mm) / 60)
                    mm = Math.ceil(distance.duration / 60) + mm - Math.floor((Math.ceil(distance.duration / 60) + mm) / 60) * 60
                    const preToTime = new Date(planDestination.date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm))


                    if (planDestination.fromTime < preToTime)
                        throw new AppError(`Thời gian đến địa điểm '${destination.name}' không được trước ${preToTime.toLocaleString()}`, StatusCodes.BAD_REQUEST)

                    planDestination.distance = distance.distance
                    planDestination.duration = distance.duration
                    planDestination.distanceText = distance.distanceText
                    planDestination.durationText = distance.durationText
                } else {
                    planDestination.distance = 0
                    planDestination.duration = 0
                    planDestination.distanceText = '0m'
                    planDestination.durationText = '0s'
                }
                hh = parseInt(planDestination.toTime.toLocaleTimeString().split(':')[0])
                mm = parseInt(planDestination.toTime.toLocaleTimeString().split(':')[1])
                await planDestination.save({ transaction: update })
                if (!user || !user.travelerPersonalities)
                    throw new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST)

                for (let i = 0; i < user.travelerPersonalities.length; i++) {
                    await DestinationPersonalites.findOrCreate({
                        where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name }
                    })
                    await DestinationPersonalites.
                        increment(
                            { planCount: 1 },
                            { where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name } }
                        )
                }
            }
        }
        await Plan.update({ estimatedCost: cost }, { where: { id: plan.id }, transaction: update })
    });
    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne,
            order: [['details', 'fromTime', 'ASC']]
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật lịch trình thành công', { plan: result });
    next();
});

export const getAllCreatedPlan = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const status = ['Draft', 'Planned', 'Activated', 'Completed'].includes(req.query.status as string) ? req.query.status as string : 'Draft'
    const plans = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status },
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        });
    const count = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status },
            attributes: ['id'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: [] }],
        });
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, plans: plans }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
});

export const getAllPublicPlan = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const plans = await Plan.findAll(
        {
            where: { isPublic: true },
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        });
    const count = await Plan.findAll(
        {
            where: { isPublic: true },
            attributes: ['id'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: [] }],
        });
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, plans: plans }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
});

export const getOnePlan = catchAsync(async (req, res, next) => {
    if (res.locals.user.roleID === Roles.Traveler) {
        await Plan.increment({ view: 1 }, { where: { id: req.params.id } })
    }
    const plan = await Plan.findOne(
        {
            where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne,
            order: [['details', 'fromTime', 'ASC']]
        });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này này', StatusCodes.NOT_FOUND));


    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { plan });
    next();
})

export const deletePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan || (res.locals.user.roleID == Roles.Traveler && plan.travelerID != res.locals.user.id))
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await plan.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Xoá lịch trình thành công', null);
    next();
})

const validate = async (body: any) => {
    const { details } = body;
    if (!details || details.length == 0)
        throw new AppError('Chi tiết lịch trình không được trống', StatusCodes.BAD_REQUEST)
    for (let i = 0; i < details.length; i++) {
        if (!details[i].destinations || details[i].destinations.length == 0)
            throw new AppError('Địa điểm không được trống', StatusCodes.BAD_REQUEST)
    };
}


const includeDetailGetOne = [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText'], include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
            }
        ]
    }
]