import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Personalities } from "../../models/personalities.model";
import { Catalogs, Roles } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash";
import { DestinationImagePrivateFields, DestinationPrivateFields, PlanDestinationPrivateFields, PlanDetailPrivateFields, PlanPrivateFields, UserPrivateFields } from "../../utils/private_field";
import { DestinationImage } from "../../models/destination_image.model";
import { User } from "../../models/user.model";
import { PlanDetail } from "../../models/plan_detail.model";
import { Op } from "sequelize";
import { Catalog } from "../../models/catalog.model";
import { DestinationCatalog } from "../../models/destination_catalog.model";
import { DestinationPersonalites } from "../../models/destination_personalities.model";

export const createPlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    const error = await validate(req.body, user)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, fromDate, toDate, estimatedCost, isPublic, details } = req.body;
    const planPersonalities = user?.travelerPersonalities as any[]
    const result = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, estimatedCost: estimatedCost, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        await plan.addPlanPersonalities(planPersonalities, { transaction: create })
        for (let i = 0; i < details.length; i++) {
            const planDetail = await PlanDetail.create(
                { date: details[i].date, planID: plan.id, stayDestinationID: details[i].stayDestinationID },
                { transaction: create }
            )
            for (let j = 0; j < details[i].destinations.length; j++) {
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planDetailID = planDetail.id;
                await planDestination.save({ transaction: create })
                for (let i = 0; i < planPersonalities.length; i++) {
                    await DestinationPersonalites.findOrCreate({
                        where: { destinationID: planDestination.destinationID, personalityName: planPersonalities[i].name }
                    })
                    await DestinationPersonalites.
                        increment(
                            { planCount: 1 },
                            { where: { destinationID: planDestination.destinationID, personalityName: planPersonalities[i].name } }
                        )
                }
            }
        }
        return plan
    })
    const plan = await Plan.findOne(
        {
            where: { id: result.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: [includeDetailGetOne]
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { plan });
    next();
});


export const updatePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const error = await validate(req.body)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { name, fromDate, toDate, estimatedCost, isPublic, details } = req.body;
    plan.name = name;
    plan.fromDate = fromDate;
    plan.toDate = toDate;
    plan.isPublic = isPublic;
    plan.estimatedCost = estimatedCost;

    const updatedPlan = await sequelizeConnection.transaction(async (update) => {
        await plan.save({ transaction: update });
        await PlanDetail.destroy({ where: { planID: plan.id }, transaction: update })
        for (let i = 0; i < details.length; i++) {
            const planDetail = await PlanDetail.create(
                { date: details[i].date, planID: plan.id },
                { transaction: update }
            )
            for (let j = 0; j < details[i].destinations.length; j++) {
                const planDestination = new PlanDestination(details[i].destinations[j]);
                planDestination.planDetailID = planDetail.id;
                await planDestination.save({ transaction: update })
            }
        }
        return plan;
    });
    const result = await Plan.findOne(
        {
            where: { id: updatedPlan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: [includeDetailGetOne]
        });
    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật lịch trình thành công', { plan: result });
    next();
});

export const getAllCreatedPlan = catchAsync(async (_req, res, next) => {

    const plans = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, isActive: false },
            attributes: { exclude: PlanPrivateFields.default },
            include: [includeDetailGetAll],
            order: [['fromDate', 'ASC'], ['details', 'date', 'ASC']]
        });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { plans });
    next();
});


export const getAllPublicPlan = catchAsync(async (_req, res, next) => {

    const plans = await Plan.findAll(
        {
            where: { isPublic: true },
            attributes: { exclude: PlanPrivateFields.default },
            include: [includeTraveler, includeDetailGetAll],
            order: [['fromDate', 'ASC'], ['details', 'date', 'ASC']]
        });

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { plans });
    next();
});

export const getOnePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne(
        {
            where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
            attributes: { exclude: PlanPrivateFields.default },
            include: [includeTraveler, includeDetailGetOne],
            order: [['details', 'date', 'ASC'], ['details', 'destinations', 'fromTime', 'ASC']]
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
            return 'Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này'
        for (let i = 0; i < planPersonalities.length; i++) {
            const count = await Personalities.count({ where: { name: planPersonalities[i].name } })
            if (count !== 1)
                return `Tính cách du lịch: ${planPersonalities[i].name} không hợp lệ`
        }
    }

    if (!details || details.length == 0)
        return 'Chi tiết lịch trình không được trống'
    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
    for (let i = 0; i < details.length; i++) {
        if (!details[i].date)
            return `Ngày thứ ${i + 1} không được trống`
        if (details[i].stayDestinationID || details[i].stayDestinationID != null) {
            let stayCatalog = [Catalogs.stay];
            let index = 0;
            do {
                const catalogs = await Catalog.findAll({ where: { parent: stayCatalog[index] } })
                if (catalogs.length > 0) {
                    catalogs.forEach(catalog => {
                        stayCatalog.push(catalog.name)
                    });
                }
                index++;
            } while (index < stayCatalog.length)
            const count = await DestinationCatalog.count({ where: { destinationID: details[i].stayDestinationID, catalogName: { [Op.or]: stayCatalog } } })
            if (count < 1)
                return `Địa điểm lưu trú của ngày ${details[i].date} không hợp lệ`
        }
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

const includeTraveler = { model: User, as: 'traveler', attributes: { exclude: UserPrivateFields[Roles.Traveler] } }

const includeDetailGetAll = {
    model: PlanDetail, as: 'details', attributes: { exclude: PlanDetailPrivateFields.default }, include: [
        {
            model: PlanDestination, as: 'destinations', attributes: { exclude: PlanDestinationPrivateFields.default }
        }
    ]
}


const includeDetailGetOne = {
    model: PlanDetail, as: 'details', attributes: { exclude: PlanDetailPrivateFields.default }, include: [
        {
            model: Destination, as: 'stayDestination', attributes: { exclude: DestinationPrivateFields.getAllTraveler }, include: [
                {
                    model: DestinationImage, as: 'images', attributes: { exclude: DestinationImagePrivateFields.default }
                }
            ]
        },
        {
            model: PlanDestination, as: 'destinations', attributes: { exclude: PlanDestinationPrivateFields.getOne }, include: [
                {
                    model: Destination, as: 'destination', attributes: { exclude: DestinationPrivateFields.getAllTraveler }, include: [
                        {
                            model: DestinationImage, as: 'images', attributes: { exclude: DestinationImagePrivateFields.default }
                        }
                    ]
                }
            ]
        }
    ]
}