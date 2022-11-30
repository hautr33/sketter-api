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
import _ from "lodash"
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
    const { name, isPublic, details } = req.body;
    const fromDate = new Date(req.body.fromDate)
    const toDate = new Date(req.body.toDate)
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)
    const today = Math.floor((Date.now() - fromDate.getTime()) / (1000 * 3600 * 24))
    if (today > 0)
        return next(new AppError('Ngày bắt đầu không được trước hôm nay', StatusCodes.BAD_REQUEST))

    const date = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) + 1
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
        for (let i = 0; i < date; i++) {
            if (details[i]) {
                const tmpDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * i)
                if (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) != 0)
                    throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)
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
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image

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
            } else {
                plan.toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * (i - 1))
            }
        }
        plan.estimatedCost = cost
        await plan.save({ transaction: create })
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


export const updatePlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id, status: 'Draft' } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await validate(req.body)

    const { name, isPublic, details } = req.body;
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)
    const fromDate = new Date(req.body.fromDate)
    const toDate = new Date(req.body.toDate)
    const today = Math.floor((Date.now() - new Date(fromDate).getTime()) / (1000 * 3600 * 24))
    if (today > 0)
        return next(new AppError('Ngày bắt đầu không được trước hôm nay', StatusCodes.BAD_REQUEST))

    const date = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) + 1
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
    stayDestinationID ? plan.stayDestinationID = stayDestinationID : 0;

    await sequelizeConnection.transaction(async (update) => {
        await plan.save({ transaction: update });
        await PlanDestination.destroy({ where: { planID: plan.id }, transaction: update })
        let cost = stay ? (stay.lowestPrice + stay.highestPrice) / 2 : 0;

        for (let i = 0; i < date; i++) {
            if (details[i]) {
                const tmpDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * i)

                if (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) != 0)
                    throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)
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
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image
                    planDestination.date = details[i].date;
                    const from = details[i].destinations[j].fromTime.split(' ');
                    const to = details[i].destinations[j].toTime.split(' ');
                    planDestination.fromTime = new Date(tmpDate.toLocaleDateString() + ' ' + from[from.length - 1])
                    planDestination.toTime = new Date(tmpDate.toLocaleDateString() + ' ' + to[to.length - 1])
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
            } else {
                plan.toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * (i - 1))
            }
        }
        plan.estimatedCost = cost
        await plan.save({ transaction: update })
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
    const date = Date.now()
    await Plan.update({ status: 'Activated' }, { where: { fromDate: { [Op.lte]: date }, status: 'Planned' } })
    await Plan.update({ status: 'Skipped' }, { where: { toDate: { [Op.lte]: (date - 1000 * 3600 * 24 * 2) }, status: 'Activated' } })
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const status = ['Draft', 'Planned', 'Activated', 'Completed'].includes(req.query.status as string) ? req.query.status as string : 'Draft'
    const plans = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status == 'Completed' ? { [Op.or]: ['Completed', 'Skipped'] } : status },
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        });
    const count = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status == 'Completed' ? { [Op.or]: ['Completed', 'Skipped'] } : status },
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
    const date = Date.now()
    await Plan.update({ status: 'Activated' }, { where: { fromDate: { [Op.lte]: date }, status: 'Planned' } })
    await Plan.update({ status: 'Skipped' }, { where: { toDate: { [Op.lte]: (date - 1000 * 3600 * 24 * 2) }, status: 'Activated' } })
    if (res.locals.user.roleID === Roles.Traveler) {
        await Plan.increment({ view: 1 }, { where: { id: req.params.id } })
    }
    const check = await Plan.findOne({
        where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
        attributes: ['status']
    })

    if (!check)
        return next(new AppError('Không tìm thấy lịch trình này này', StatusCodes.NOT_FOUND));
    const result = await Plan.findOne(
        {
            where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
            attributes: { exclude: PlanPrivateFields.default },
            include: check.status == 'Completed' ? includeDetailGetOneCompleted : includeDetailGetOne,
            order: [['details', 'fromTime', 'ASC']]
        });

    if (!result)
        return next(new AppError('Không tìm thấy lịch trình này này', StatusCodes.NOT_FOUND));
    const plan = _.omit(result.toJSON(), []);
    if (check.status !== 'Completed')
        plan.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { plan });
    next();
})

export const saveDraftPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Draft', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const date = Date.now()
    if (Math.floor((date - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24)) > 0)
        throw new AppError(`Ngày bắt đầu không được trước hôm nay`, StatusCodes.BAD_REQUEST)

    const planDes = await PlanDestination.findAll({ where: { planID: plan.id } })
    let maxDate = plan.fromDate
    await sequelizeConnection.transaction(async (activate) => {
        for (let i = 0; i < planDes.length; i++) {

            if (planDes[i].date > maxDate)
                maxDate = planDes[i].date

            const destination = await Destination.findOne({ where: { id: planDes[i].destinationID } })
            if (!destination || destination.status !== 'Open')
                throw new AppError(`Địa điểm '${destination ? destination.name : planDes[i].destinationName}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)
            planDes[i].destinationName = destination.name
            planDes[i].destinationImage = destination.image
            await planDes[i].save({ transaction: activate })
        }
        plan.toDate = maxDate
        plan.status = 'Planned'
        await plan.save({ transaction: activate })
    })

    res.resDocument = new RESDocument(StatusCodes.OK, `Bạn đã hoàn tất việc lên kế hoạch cho "${plan.name}"`, null);
    next();
})

export const completePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Activated', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    // const now = Date.now()
    // if (Math.floor((now - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24)) < 0)
    //     throw new AppError(`Ngày bắt đầu không được trước hôm nay`, StatusCodes.BAD_REQUEST)
    const date = (new Date(plan.toDate).getTime() - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24) + 1
    const { stayDestinationID, totalCost, details } = req.body;

    plan.actualStayDestinationID = stayDestinationID
    plan.actualCost = totalCost
    plan.status = "Completed"

    const checkinDes: PlanDestination[] = []
    for (let i = 0; i < date; i++) {
        if (details[i]) {
            const tmpDate = new Date(new Date(plan.fromDate).getTime() + 1000 * 60 * 60 * 24 * i)
            if (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) != 0)
                throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)

            for (let j = 0; j < details[i].destinations.length; j++) {
                const destination = await Destination.findOne({
                    where: { id: details[i].destinations[j].destinationID }, attributes: ['name', 'lowestPrice', 'highestPrice', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status'],
                    include: [
                        { model: Catalog, as: 'catalogs', where: { name: { [Op.notILike]: '%lưu trú%' }, parent: { [Op.notILike]: '%lưu trú%' } } }
                    ]
                })

                if (!destination || destination === null)
                    throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)

                const from = details[i].destinations[j].fromTime.split(' ');
                const to = details[i].destinations[j].toTime.split(' ');
                const des = new PlanDestination()
                des.planID = plan.id
                des.destinationID = details[i].destinations[j].destinationID
                des.date = tmpDate
                des.fromTime = new Date(tmpDate.toLocaleDateString() + ' ' + from[from.length - 1])
                des.toTime = new Date(tmpDate.toLocaleDateString() + ' ' + to[to.length - 1])
                des.profile = 'driving'
                des.status = 'New'
                des.destinationName = destination.name
                des.destinationImage = destination.image
                des.rating = details[i].destinations[j].rating
                des.description = details[i].destinations[j].description
                des.isPlan = false
                if (j !== 0) {
                    const distance = await getDestinationDistanceService(details[i].destinations[j - 1].destinationID, details[i].destinations[j].destinationID, des.profile)
                    if (!distance)
                        throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa 2 địa điểm', StatusCodes.BAD_REQUEST)

                    des.distance = distance.distance
                    des.duration = distance.duration
                    des.distanceText = distance.distanceText
                    des.durationText = distance.durationText
                } else {
                    des.distance = 0
                    des.duration = 0
                    des.distanceText = '0m'
                    des.durationText = '0s'
                }
                checkinDes.push(des)
            }
        } else {
            throw new AppError(`Chi tiết lịch trình ngày thứ ${i} không hợp lệ`, StatusCodes.BAD_REQUEST)
        }

    }


    const planDes = await PlanDestination.findAll({ where: { planID: plan.id } })
    for (let i = 0; i < planDes.length; i++) {
        planDes[i].status = 'Skipped'
        let isCheck = false
        for (let j = 0; j < checkinDes.length && !isCheck; j++) {
            if (Math.floor((new Date(planDes[i].date).getTime() - new Date(checkinDes[j].date).getTime()) / (1000 * 3600 * 24)) == 0 && planDes[i].destinationID == checkinDes[j].destinationID) {
                planDes[i].status = 'Checked-in'
                checkinDes[j].status = 'Checked-in'
                isCheck = true
            }
        }
    }

    await sequelizeConnection.transaction(async (complete) => {

        for (let i = 0; i < planDes.length; i++)
            await planDes[i].save({ transaction: complete })

        for (let i = 0; i < checkinDes.length; i++)
            await checkinDes[i].save({ transaction: complete })

        await plan.save({ transaction: complete })
    })

    res.resDocument = new RESDocument(StatusCodes.OK, `Bạn đã hoàn tất lịch trình "${plan.name}"`, null);
    next();
})

export const deletePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Draft', travelerID: res.locals.user.id } });

    if (!plan)
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
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
        where: { isPlan: true },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date'],
    }
]

const includeDetailGetOneCompleted = [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
        where: { isPlan: true },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
        where: { isPlan: false },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
            }
        ]
    }
]