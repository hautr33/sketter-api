import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Personalities } from "../../models/personalities.model";
import { Roles } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash";
import { PlanPrivateFields } from "../../utils/private_field";
import { User } from "../../models/user.model";
import { PlanDetail } from "../../models/plan_detail.model";
import { Op } from "sequelize";
import { DestinationPersonalites } from "../../models/destination_personalities.model";
import { PAGE_LIMIT } from "../../config/default";

export const createPlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    await validate(req.body, user)


    const { name, fromDate, toDate, stayDestinationID, isPublic, details } = req.body;
    const plan = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, stayDestinationID: stayDestinationID, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        let cost = 0;
        for (let i = 0; i < details.length; i++) {
            for (let j = 0; j < details[i].destinations.length; j++) {
                const destination = await Destination.findOne({ where: { id: details[i].destinations[j].destinationID }, attributes: ['lowestPrice', 'highestPrice'] })
                if (!destination || destination === null)
                    throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)
                cost += (destination.lowestPrice + destination.highestPrice) / 2
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planID = plan.id;
                planDestination.date = details[i].date;
                await planDestination.save({ transaction: create })
                for (let i = 0; i < user?.travelerPersonalities.length; i++) {
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
        console.log(cost);

        await Plan.update({ estimatedCost: cost }, { where: { id: plan.id }, transaction: create })
        return plan
    })

    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { plan: result });
    next();
});

export const updatePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await validate(req.body)

    const { name, fromDate, toDate, isPublic, details } = req.body;
    name ? plan.name = name : 0;
    fromDate ? plan.fromDate = fromDate : 0;
    toDate ? plan.toDate = toDate : 0;
    isPublic ? plan.isPublic = isPublic : 0;
    let cost = 0

    await sequelizeConnection.transaction(async (update) => {
        await plan.save({ transaction: update });
        await PlanDetail.destroy({ where: { planID: plan.id }, transaction: update })
        for (let i = 0; i < details.length; i++) {
            for (let j = 0; j < details[i].destinations.length; j++) {
                const destination = await Destination.findOne({ where: { id: details[i].destinations[j].destinationID }, attributes: ['lowestPrice', 'highestPrice'] })
                if (!destination || destination === null)
                    throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)
                cost += (destination.lowestPrice + destination.highestPrice) / 2
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planID = plan.id;
                planDestination.planID = details[i].date;
                await planDestination.save({ transaction: update })
            }
        }
        await Plan.update({ estimatedCost: cost }, { where: { id: plan.id }, transaction: update })
    });
    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne
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
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'isPublic', 'createdAt'],
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
            attributes: ['id', 'name', 'fromDate', 'toDate', 'estimatedCost', 'isPublic', 'createdAt'],
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
    const plan = await Plan.findOne(
        {
            where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
            attributes: { exclude: PlanPrivateFields.default },
            include: includeDetailGetOne,
            order: [['details', 'fromTime', 'ASC']],
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

const validate = async (body: any, user?: any) => {
    const { details } = body;
    if (user) {
        const planPersonalities = user.travelerPersonalities

        if (!planPersonalities || planPersonalities === '' || planPersonalities === null || planPersonalities.length === 0)
            throw new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST)
    }

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
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'timeTraveling'], include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'estimatedTimeStay']
            }
        ]
    }
]