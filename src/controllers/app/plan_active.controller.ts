import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Status } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash"
import { PlanPrivateFields } from "../../utils/private_field";
import { User } from "../../models/user.model";
import { Op } from "sequelize";
import { getDestinationDistanceService } from "../../services/destination.service";
import { Catalog } from "../../models/catalog.model";

export const saveDraftPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Draft', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const date = Date.now()
    if (Math.floor((date - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24)) >= 0)
        throw new AppError(`Ngày bắt đầu kể từ ngày mai`, StatusCodes.BAD_REQUEST)

    const planDes = await PlanDestination.findAll({ where: { planID: plan.id } })
    let maxDate = plan.fromDate
    await sequelizeConnection.transaction(async (save) => {
        for (let i = 0; i < planDes.length; i++) {

            if (planDes[i].date > maxDate)
                maxDate = planDes[i].date

            const destination = await Destination.findOne({ where: { id: planDes[i].destinationID } })
            if (!destination || destination.status !== 'Open')
                throw new AppError(`Địa điểm '${destination ? destination.name : planDes[i].destinationName}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)
            planDes[i].destinationName = destination.name
            planDes[i].destinationImage = destination.image
            const cloneDes = new PlanDestination();
            cloneDes.planID = planDes[i].planID
            cloneDes.destinationID = planDes[i].destinationID
            cloneDes.date = planDes[i].date
            cloneDes.fromTime = planDes[i].fromTime
            cloneDes.toTime = planDes[i].toTime
            cloneDes.distance = planDes[i].distance
            cloneDes.duration = planDes[i].duration
            cloneDes.profile = planDes[i].profile
            cloneDes.distanceText = planDes[i].distanceText
            cloneDes.durationText = planDes[i].durationText
            cloneDes.destinationName = planDes[i].destinationName
            cloneDes.destinationImage = planDes[i].destinationImage
            cloneDes.status = planDes[i].status
            cloneDes.isPlan = false
            await cloneDes.save({ transaction: save })
            await planDes[i].save({ transaction: save })
        }
        plan.toDate = maxDate
        plan.actualCost = plan.estimatedCost
        plan.actualStayDestinationID = plan.stayDestinationID
        plan.status = 'Planned'
        await plan.save({ transaction: save })
    })

    res.resDocument = new RESDocument(StatusCodes.OK, `Bạn đã hoàn tất việc lên kế hoạch cho "${plan.name}"`, null);
    next();
})


export const checkinPlan = catchAsync(async (req, res, next) => {

    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id, status: 'Activated' } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const { totalCost, details } = req.body;
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)

    const date = Math.floor((Date.now() - plan.fromDate.getTime()) / (1000 * 3600 * 24)) + 1
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID
    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    plan.actualStayDestinationID = stayDestinationID
    plan.actualCost = totalCost

    await sequelizeConnection.transaction(async (checkin) => {
        await plan.save({ transaction: checkin });

        for (let i = 0; i < date; i++) {
            if (details[i]) {

                const tmpDate = new Date(plan.fromDate.getTime() + 1000 * 3600 * 24 * i)
                await PlanDestination.destroy({ where: { planID: plan.id, isPlan: false, date: tmpDate }, transaction: checkin })

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

                    if (destination.status === Status.closed)
                        throw new AppError(`Địa điểm '${destination.name}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)

                    if (destination.status === Status.deactivated)
                        return next(new AppError(`Địa điểm '${destination.name}' đã bị ngưng hoạt động, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST))
                    const planDestination = new PlanDestination(details[i].destinations[j]);
                    planDestination.planID = plan.id;
                    planDestination.destinationID = details[i].destinations[j].destinationID;
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image
                    planDestination.profile = 'driving'
                    planDestination.status = 'Planned'
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
                    await planDestination.save({ transaction: checkin })
                }
            }
        }
        await plan.save({ transaction: checkin })
    });
    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOneInclude(plan.status ?? 'Draft'),
            order: [['details', 'fromTime', 'ASC']]
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật lịch trình thành công', { plan: result });
    next();
});


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


const getOneInclude = (status: string) => status == 'Draft' ? [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
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
] : (status == 'Completed' ? [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
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
] : [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
        where: { isPlan: false },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date'],
    }
])


// const includeDetailGetOne = [
//     { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
//     { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     {
//         model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: true },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     },
//     {
//         model: PlanDestination, as: 'travelDetails', attributes: ['date'],
//     }
// ]

// const includeDetailGetOneCompleted = [
//     { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
//     { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     {
//         model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: true },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     },
//     {
//         model: PlanDestination, as: 'travelDetails', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: false },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     }
// ]