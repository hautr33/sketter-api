import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDetail } from "../../models/plan_detail.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { TravelPersonalityType } from "../../models/personality_type.model";
import { Roles } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";

export const createPlan = catchAsync(async (req, res, next) => {
    const { name, fromDate, toDate, isPublic, personalities } = req.body;
    const details = req.body.details as PlanDetail[];

    if (!personalities || personalities.length == 0)
        return next(new AppError('Tính cách du lịch không được trống', StatusCodes.BAD_REQUEST))

    try {
        const result = await sequelizeConnection.transaction(async (create) => {
            const plan = await Plan.create(
                { name: name, fromDate: fromDate, toDate: toDate, isPublic: isPublic, travelerID: res.locals.user.id },
                { transaction: create })
            await plan.addTravelPersonalityTypes(personalities, { transaction: create })
            for (let i = 0; i < details.length; i++) {
                const planDetail = new PlanDetail(details[i]);
                planDetail.planID = plan.id;
                await planDetail.save({ transaction: create })
            };
            return plan
        })

        res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
        next();
    } catch (error: any) {
        if (error.message.includes('Plan_TravelPersonalities'))
            return next(new AppError("Tính cách du lịch không hợp lệ", StatusCodes.BAD_REQUEST))

        return next(new AppError(error, StatusCodes.BAD_REQUEST))
    }
});


export const updatePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id } });
    if (!plan || res.locals.user.roleID != Roles.Traveler && plan.travelerID != res.locals.user.id)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

    const { name, fromDate, toDate, isPublic, personalities } = req.body;
    const details = req.body.details as PlanDetail[];
    if (!personalities || personalities.length == 0)
        return next(new AppError('Tính cách du lịch không được trống', StatusCodes.BAD_REQUEST))

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

export const getPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne(
        {
            where: { id: req.params.id, travelerID: res.locals.user.id },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                {
                    model: PlanDetail,
                },
            ]
        });


    if (!plan)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND));

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

export const getAllPlan = catchAsync(async (_req, res, next) => {

    const result = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id },
            include: [
                { model: TravelPersonalityType, through: { attributes: [] }, attributes: { exclude: ['id'] } },
                {
                    model: PlanDetail,
                },
            ]
        });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', result);
    next();


});