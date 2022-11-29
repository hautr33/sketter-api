import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Personalities } from "../../models/personalities.model";
import { Status } from "../../utils/constant";
import { Destination } from "../../models/destination.model";
import _ from "lodash";
import { Op } from "sequelize";
import { Catalog } from "../../models/catalog.model";
import { Plan } from "../../models/plan.model";
import { PlanDestination } from "../../models/plan_destination.model";
import sequelizeConnection from "../../db/sequelize.db";
import { getDestinationDistanceService } from "../../services/destination.service";
import { TimeFrame } from "../../models/time_frame.model";

export const createSmartPlan = catchAsync(async (req, res, next) => {
    await Plan.destroy({ where: { status: 'Smart', travelerID: res.locals.user.id }, force: true })
    const now = Date.now()
    const { name, cityID, start, end, dailyStayCost, personalities } = req.body;
    const fromDate = new Date(req.body.fromDate)
    const toDate = new Date(req.body.toDate)
    const today = Math.floor((now - fromDate.getTime()) / (1000 * 3600 * 24))
    if (today > 0)
        return next(new AppError('Ngày bắt đầu không được trước hôm nay', StatusCodes.BAD_REQUEST))

    const date = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) + 1
    if (date > 4)
        return next(new AppError('Lịch trình tối đa 4 ngày', StatusCodes.BAD_REQUEST))

    const maxTime = date * 10 * 60
    if (dailyStayCost * date / req.body.cost > 0.5)
        return next(new AppError('Chi phí lưu trú không được quá 50% chi phí chuyến đi', StatusCodes.BAD_REQUEST))
    for (let i = 0; i < 3; i++) {
        const stay = await Destination.findAll({
            where: { status: Status.open, cityID: cityID },
            attributes: ['id', 'name', 'lowestPrice', 'highestPrice', 'avgRating', 'view', 'createdAt'],
            include: [
                {
                    model: Personalities,
                    as: 'destinationPersonalities',
                    through: { attributes: ['planCount', 'visitCount'], as: 'count' },
                    attributes: ['name']
                },
                {
                    model: Catalog,
                    as: 'catalogs',
                    where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] },
                    through: { attributes: [] },
                    attributes: []
                }

            ]
        })
        let des: Destination[] = []
        let bonus = 0
        while (des.length == 0) {
            des = stay.filter(function (value) {
                return (Math.ceil((value.highestPrice + value.lowestPrice) / 2) < dailyStayCost + bonus)
            });
            bonus += 50
        }

        des = calcPoint(des, now)
        des.sort((a, b) => ((a.point ?? 0) > (b.point ?? 0)) ? -1 : 1).slice(0, 1).slice(0, 5);
        const stayDestination = des[Math.ceil(Math.random() * des.length) - 1]
        const maxCost = req.body.cost - Math.ceil((stayDestination.highestPrice + stayDestination.lowestPrice) / 2) * date;

        des = await Destination.findAll({
            where: { status: Status.open, cityID: cityID },
            attributes: ['id', 'name', 'lowestPrice', 'highestPrice', 'openingTime', 'closingTime', 'estimatedTimeStay', 'avgRating', 'view', 'createdAt'],
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
                    attributes: ['name']
                },
                {
                    model: Catalog,
                    as: 'catalogs',
                    where: { name: { [Op.notILike]: '%Lưu Trú%' }, parent: { [Op.notILike]: '%Lưu Trú%' } },
                    through: { attributes: [] },
                    attributes: []
                },
                {
                    model: TimeFrame,
                    as: 'recommendedTimes',
                    through: { attributes: ['planCount', 'visitCount'], as: 'count' },
                    attributes: ['from', 'to']
                }
            ]
        })


        des = calcPoint(des, now)

        des.sort((a, b) => ((a.point ?? 0) > (b.point ?? 0)) ? -1 : 1).slice(0, date * 15);

        let sorted: Destination[] = [];
        let cost = 0;
        let time = 0;

        des.forEach(des => {
            if (des.point && des.cost && cost + des.cost <= maxCost && time + des.estimatedTimeStay <= maxTime) {
                cost += des.cost
                time += des.estimatedTimeStay
                sorted.push(des)
            }
        });

        console.log(sorted.length + ' / ' + des.length);
        console.log(`Cost: ${Math.ceil((stayDestination.highestPrice + stayDestination.lowestPrice) / 2) * date} + ${cost} = ${Math.ceil((stayDestination.highestPrice + stayDestination.lowestPrice) / 2) * date + cost} / ${req.body.cost}`);
        console.log(maxTime + ' / ' + time);

        let planName = name + ` (${i + 1})`
        sorted.sort((a, b) => (a.openingTime < b.openingTime) ? -1 : 1)
        cost = Math.ceil((stayDestination.highestPrice + stayDestination.lowestPrice) / 2) * date
        await sequelizeConnection.transaction(async (create) => {
            const plan = await Plan.create(
                {
                    name: planName,
                    fromDate: fromDate,
                    toDate: toDate,
                    stayDestinationID: stayDestination.id,
                    isPublic: false,
                    status: 'Smart',
                    travelerID: res.locals.user.id
                },
                {
                    transaction: create
                })
            let i = 0
            let timeCount = 0
            let isFirst = true
            let isDone = false
            let hh = parseInt(start.split(':')[0])
            let mm = parseInt(start.split(':')[1])
            let preDes = null
            while (i < date && sorted.length != 0 && !isDone) {
                const planDes = new PlanDestination()
                planDes.planID = plan.id
                const time = (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                let max = 1
                sorted.forEach(des => {
                    des.point = 0
                    if (des.openingTime <= time && time <= des.closingTime)
                        des.point = 1
                    des.recommendedTimes?.forEach(recommendedTime => {
                        if (recommendedTime.from <= time && time <= recommendedTime.to) {
                            des.point = 2
                            des.point += recommendedTime.count.planCount + recommendedTime.count.visitCount * 2
                            if (max < des.point)
                                max = des.point
                        }
                    });
                });
                const des = sorted.find(function (value) {
                    return value.point = max;
                })
                if (des) {
                    planDes.destinationID = des.id
                    planDes.profile = 'driving'
                    if (!isFirst && preDes) {
                        const distance = await getDestinationDistanceService(des.id as string, preDes.destinationID as string, 'driving')
                        if (!distance)
                            throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa các địa điểm! Xin vui lòng thử lại sau!', StatusCodes.BAD_GATEWAY)

                        hh += Math.floor((Math.ceil(distance.duration / 60) + mm) / 60)
                        mm = Math.ceil(distance.duration / 60) + mm - Math.floor((Math.ceil(distance.duration / 60) + mm) / 60) * 60
                        planDes.distance = distance.distance
                        planDes.duration = distance.duration
                        planDes.distanceText = distance.distanceText
                        planDes.durationText = distance.durationText
                    } else {
                        if (sorted.length < 4) {
                            isDone = true
                            plan.toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * (i - 1))
                        }
                        else {
                            planDes.distance = 0
                            planDes.duration = 0
                            planDes.distanceText = '0m'
                            planDes.durationText = '0s'
                            isFirst = false
                        }
                    }

                    if (!isDone) {
                        planDes.date = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * i)
                        const fromTime = planDes.date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                        hh += Math.floor((des.estimatedTimeStay + mm) / 60)
                        mm = des.estimatedTimeStay + mm - Math.floor((des.estimatedTimeStay + mm) / 60) * 60
                        const toTime = planDes.date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                        if (hh == 23 && mm > 1 || hh > 23 || toTime > end || (timeCount + des.estimatedTimeStay > maxTime / date)) {
                            timeCount = 0
                            isFirst = true
                            hh = parseInt(start.split(':')[0])
                            mm = parseInt(start.split(':')[1])
                            i++
                        } else {
                            cost += Math.ceil((des.highestPrice + des.lowestPrice) / 2)
                            timeCount += des.estimatedTimeStay
                            planDes.fromTime = new Date(fromTime)
                            planDes.toTime = new Date(toTime)
                            await planDes.save({ transaction: create })
                            sorted = sorted.filter(function (value) {
                                return value.id !== des.id
                            });
                            preDes = planDes
                        }
                    }
                } else {
                    throw new AppError('Có lỗi xảy ra khi tạo lịch trình! Xin vui lòng thử lại sau!', StatusCodes.BAD_GATEWAY)
                }
            }
            plan.estimatedCost = cost
            await plan.save({ transaction: create })
        })
    }

    const plans = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: 'Smart' },
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [['name', 'ASC']],
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { count: plans.length, plans: plans });
    next();
})

export const saveSmartPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id, status: 'Smart' } })
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình', StatusCodes.BAD_REQUEST))
    await sequelizeConnection.transaction(async (save) => {
        plan.name = plan.name.split(' (')[0]
        plan.status = 'Draft'
        await plan.save({ transaction: save })
        await Plan.destroy({ where: { status: 'Smart', travelerID: res.locals.user.id }, force: true, transaction: save })
    })
    res.resDocument = new RESDocument(StatusCodes.OK, `Lịch trình "${plan.name}" đã được lưu vào bản nháp`, null)
    next()
})

const calcPoint = (des: Destination[], now: number): Destination[] => {
    let maxView = 0
    let maxPersonality = 0
    let maxDate = 0
    des.forEach(des => {
        if (des.view && maxView < des.view)
            maxView = des.view
        des.personalityCount = 0

        des.destinationPersonalities?.forEach(personal => {
            des.personalityCount += personal.count.planCount + personal.count.visitCount * 2
        });

        if (maxPersonality < des.personalityCount)
            maxPersonality = des.personalityCount
        des.dateCount = des.createdAt?.getTime() ? (now - des.createdAt?.getTime()) / (1000 * 3600 * 24) : -1
        if (maxDate < des.dateCount)
            maxDate = des.dateCount
        des.cost = Math.ceil((des.highestPrice + des.lowestPrice) / 2)
    });

    des.forEach(des => {
        des.point = (
            ((des.view ?? 0) / maxView) +
            ((des.dateCount ? maxDate - des.dateCount : 0) / maxDate) * 2 +
            (((des.personalityCount && des.personalityCount > 0 ? des.personalityCount / maxPersonality : Math.random() * 0.5 + 0.25) +
                (des.avgRating && des.avgRating > 0 ? des.avgRating / 5 : Math.random() * 0.5 + 0.25)) / 2) * 3
        ) / 6
    });

    return des
}


// const includeDetailGetOne = [
//     { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
//     { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     {
//         model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText'], include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     }
// ]