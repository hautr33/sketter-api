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
import { DestinationPrivateFields, PlanDetailPrivateFields, PlanPrivateFields, UserPrivateFields } from "../../utils/private_field";
import { Destination_Image } from "../../models/destination_image.model";
import { User } from "../../models/user.model";

export const createPlan = catchAsync(async (req, res, next) => {
    const error = await validate(req.body, res.locals.user)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, fromDate, toDate, estimatedCost, isPublic, details } = req.body;
    const planPersonalities = res.locals.user.travelerPersonalities
    const result = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, estimatedCost: estimatedCost, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        await plan.addPlanPersonalities(planPersonalities, { transaction: create })
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

    const { name, fromDate, toDate, estimatedCost, isPublic, details } = req.body;
    plan.name = name;
    plan.fromDate = fromDate;
    plan.toDate = toDate;
    plan.isPublic = isPublic;
    plan.estimatedCost = estimatedCost;

    try {
        const result = await sequelizeConnection.transaction(async (update) => {
            await plan.save({ transaction: update });
            await PlanDetail.destroy({ where: { planID: plan.id }, transaction: update })
            for (let i = 0; i < details.length; i++) {
                for (let j = 0; j < details[i].destinations.length; j++) {
                    const planDetail = new PlanDetail(details[i].destinations[j]);
                    planDetail.date = details[i].date;
                    planDetail.planID = plan.id;
                    await planDetail.save({ transaction: update })
                }
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
            attributes: { exclude: PlanPrivateFields.default },
            include: [{ model: PlanDetail, as: 'details', attributes: { exclude: PlanDetailPrivateFields.default } }]
        });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();
});

export const getPlan = catchAsync(async (req, res, next) => {
    const result = await Plan.findOne(
        {
            where: { id: req.params.id, travelerID: res.locals.user.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: planInclude
        });

    if (!result)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    const plan = _.omit(result.toJSON(), []);
    plan.planPersonalities = _.map(plan.planPersonalities, function (personality) { return personality.name; })
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

const validate = async (body: any, user?: any) => {
    const { name, fromDate, toDate, estimatedCost, isPublic, details } = body;
    if (!name || name === '' || name === null)
        return 'Tên lịch trình không được trống'
    if (!fromDate || fromDate === '' || fromDate === null)
        return 'Ngày bắt đầu không được trống'
    if (!toDate || toDate === '' || toDate === null)
        return 'Ngày kết thúc không được trống'
    if (typeof estimatedCost !== 'number' || estimatedCost < 0)
        return 'Chi phí dự tính không hợp lệ'

    if (!_.isBoolean(isPublic))
        return 'Tình trạng công khai không hợp lệ'

    if (user) {
        const planPersonalities = user.travelerPersonalities

        if (!planPersonalities || planPersonalities === '' || planPersonalities === null || planPersonalities.length === 0)
            return 'Tính cách du lịch không được trống'
        for (let i = 0; i < planPersonalities.length; i++) {
            const count = await TravelPersonalityType.count({ where: { name: planPersonalities[i] } })
            if (count !== 1)
                return `Tính cách du lịch: ${planPersonalities[i]} không hợp lệ`
        }
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

const planInclude = [
    { model: TravelPersonalityType, as: 'planPersonalities', through: { attributes: [] }, attributes: { exclude: ['id', 'Plan_TravelPersonalities'] } },
    { model: User, as: 'traveler', attributes: { exclude: UserPrivateFields[Roles.Traveler] } },
    {
        model: PlanDetail, as: 'details', attributes: { exclude: PlanDetailPrivateFields.default }, include: [
            {
                model: Destination, as: 'destination', attributes: { exclude: DestinationPrivateFields.getAllTraveler }, include: [
                    { model: Destination_Image, as: 'images', attributes: { exclude: ['destinationID', 'id'] } }
                ]
            }
        ]
    },
]