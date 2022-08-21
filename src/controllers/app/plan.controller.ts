import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/appError";
import { PlanDetail } from "../../models/planDetail.model";
import catchAsync from "../../utils/catchAsync";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/RESDocument";

export const createPlan = catchAsync(async (req, res, next) => {
    const { name, fromDate, toDate, isPublic, personalities } = req.body;

    const details = req.body.details as PlanDetail[]

    if (!personalities || personalities.length == 0)
        return next(new AppError('Tính cách du lịch không được trống', StatusCodes.BAD_REQUEST))

    const plan = await Plan.create({
        name: name, fromDate: fromDate, toDate: toDate,
        isPublic: isPublic, travelerID: res.locals.user.id
    });

    await plan.addTravelPersonalityTypes(personalities);
    await plan.addDestinations(details);

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', plan);
    next();

});