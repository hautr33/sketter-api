import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDetail } from "../../models/plan_detail.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { TravelPersonalityType } from "../../models/personality_type.model";
import { Roles } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash";
import { DestinationPrivateFields } from "../../utils/private_field";
import { Destination_Image } from "../../models/destination_image.model";

export const createPlan = catchAsync(async (req, res, next) => {
    const error = await validate(req.body)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, fromDate, toDate, isPublic, personalities, details } = req.body;
    const result = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        await plan.addTravelPersonalityTypes(personalities, { transaction: create })
        for (let i = 0; i < details.length; i++) {
            for (let j = 0; j < details[i].destinations.length; j++) {
                const planDetail = new PlanDetail(details[i].destinations[j]);
                planDetail.date = details[i].date;
                planDetail.planID = plan.id;
                await planDetail.save({ transaction: create })
            }
        }
        return plan
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();
});


export const updatePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id } });
    if (!plan || res.locals.user.roleID != Roles.Traveler && plan.travelerID != res.locals.user.id)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    const error = await validate(req.body)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, fromDate, toDate, isPublic, personalities, details } = req.body;
    plan.name = name;
    plan.fromDate = fromDate;
    plan.toDate = toDate;
    plan.isPublic = isPublic;

    try {
        const result = await sequelizeConnection.transaction(async (update) => {
            await plan.save({ transaction: update });
            await plan.setTravelPersonalityTypes(personalities, { transaction: update })
            await PlanDetail.destroy({ where: { planID: plan.id }, transaction: update })
            for (let i = 0; i < details.length; i++) {
                const detail = new PlanDetail(details[i])
                detail.planID = plan.id;
                await detail.save({ transaction: update })
            }
            return plan;
        });

        res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
        next();
    } catch (error: any) {
        if (error.message.includes('Plan_TravelPersonalities'))
            return next(new AppError("Tính cách du lịch không hợp lệ", StatusCodes.BAD_REQUEST))

        return next(new AppError(error, StatusCodes.BAD_REQUEST))
    }
});

export const getAllPlan = catchAsync(async (_req, res, next) => {

    const result = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id },
            include: [
                { model: TravelPersonalityType, as: 'planPersonalities', through: { attributes: [] }, attributes: { exclude: ['id', 'Plan_TravelPersonalities'] } },
                {
                    model: PlanDetail, as: 'details',
                },
            ]
        });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();
});

export const getPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne(
        {
            where: { id: req.params.id, travelerID: res.locals.user.id },
            include: [
                { model: TravelPersonalityType, as: 'planPersonalities', through: { attributes: [] }, attributes: { exclude: ['id'] } },
                {
                    model: PlanDetail, as: 'details'
                },
            ]
        });

    if (!plan)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    const details = _.get(plan, 'details')

    for (let i = 0; i < details.length; i++) {
        const destination = await Destination.findByPk(
            details[i].destinationID,
            {
                attributes: { exclude: DestinationPrivateFields.default },
                include: [
                    { model: Destination_Image, as: 'images', attributes: { exclude: ['destinationID', 'id'] } }
                ]
            });
        // _.create(details[i], { 'destination': destination });
        _.update(details, `[${i}].destinationID`, function () { return destination; })
    }
    _.update(plan, 'details', function () { return details; })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', plan);
    next();
})

export const deletePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findByPk(req.params.id);

    if (!plan || (res.locals.user.roleID == Roles.Traveler && plan.travelerID != res.locals.user.id))
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    await plan.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'deleted', null);
    next();
})

const validate = async (body: any) => {
    const { name, fromDate, toDate, isPublic, personalities, details } = body;

    if (!name || name === '' || name === null)
        return 'Tên địa điểm không được trống'
    if (!fromDate || fromDate === '' || fromDate === null)
        return 'Ngày bắt đầu không được trống'
    if (!toDate || toDate === '' || toDate === null)
        return 'Ngày kết thúc không được trống'
    if (!_.isBoolean(isPublic))
        return 'Tình trạng công khai không hợp lệ'

    if (!personalities || personalities === '' || personalities === null || personalities.length === 0)
        return 'Tính cách du lịch không được trống'
    for (let i = 0; i < personalities.length; i++) {
        const count = await TravelPersonalityType.count({ where: { name: personalities[i] } })
        if (count !== 1)
            return `Tính cách du lịch: ${personalities[i]} không hợp lệ`
    }

    if (!details || details.length == 0)
        return 'Chi tiết lịch trình không được trống'
    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
    for (let i = 0; i < details.length; i++) {
        if (!details[i].date)
            return `Ngày thứ ${i + 1} không được trống`
        if (!details[i].destinations || details[i].destinations.length == 0)
            return 'Địa điểm không được trống'
        for (let j = 0; j < details[i].destinations.length; j++) {
            const count = await Destination.count({ where: { id: details[i].destinations[j].destinationID } })
            if (count != 1)
                return `Địa điểm với id: ${details[i].destinations[j].destinationID} không hợp lệ`
            if (!details[i].destinations[j].fromTime || !details[i].destinations[j].fromTime.match(regex))
                return `Giờ đến địa điểm với id: ${details[i].destinations[j].destinationID} không hợp lệ`
            if (!details[i].destinations[j].toTime || !details[i].destinations[j].toTime.match(regex))
                return `Giờ rời khỏi địa điểm với id: ${details[i].destinations[j].destinationID} không hợp lệ`
        };

    };
    return null
}