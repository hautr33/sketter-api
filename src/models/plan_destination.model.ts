import { StatusCodes } from 'http-status-codes';
import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, Op } from 'sequelize';
import AppError from '../utils/app_error';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { Destination } from './destination.model';
import { PlanDetail } from './plan_detail.model';

export class PlanDestination extends Model<InferAttributes<PlanDestination>, InferCreationAttributes<PlanDestination>> {
    declare id?: string;
    planDetailID!: ForeignKey<PlanDetail['id']>;
    destinationID!: ForeignKey<Destination['id']>;
    fromTime!: string;
    toTime!: string;
    distance!: number;
    timeTraveling!: number;
    checkinTime?: Date;
    checkoutTime?: Date;
}

PlanDestination.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    planDetailID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    fromTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ bắt đầu' },
            notEmpty: { msg: 'Vui lòng nhập giờ bắt đầu' }
        }
    },
    toTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ kết thúc' },
            notEmpty: { msg: 'Vui lòng nhập giờ kết thúc' }
        }
    },
    distance: {
        type: DataTypes.REAL,
        allowNull: false,
        validate: {
            notNull: { msg: 'Khảng cách đến địa điểm không được trống' },
            notEmpty: { msg: 'Khảng cách đến địa điểm không được trống' }
        }
    },
    timeTraveling: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Thời gian di chuyển đến địa điểm không được trống' },
            notEmpty: { msg: 'Thời gian di chuyển đến địa điểm không được trống' }
        }
    },
    checkinTime: {
        type: DataTypes.DATE
    },
    checkoutTime: {
        type: DataTypes.DATE
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDestination' // We need to choose the model name
});


Destination.hasMany(PlanDestination, { foreignKey: 'destinationID', as: 'destination' })
PlanDestination.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destination' })

PlanDestination.beforeSave(async (planDes) => {
    const timeRegex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
    const { fromTime, toTime, distance, timeTraveling, destinationID
    } = planDes;
    const des = await Destination.findOne(
        {
            where: { id: destinationID },
            attributes: ['name'],
            include: [
                {
                    model: Catalog,
                    where: { name: { [Op.notILike]: '%Lưu Trú%' }, parent: { [Op.notILike]: '%Lưu Trú%' } },
                    as: 'catalogs',
                    through: { attributes: [] },
                    attributes: []
                }]
        }
    )
    if (!des || des === null)
        throw new AppError(`Địa điểm với ID: ${destinationID} không hợp lệ`, StatusCodes.BAD_REQUEST)

    if (!fromTime.match(timeRegex))
        throw new AppError(`Giờ bắt đầu (HH:MM): ${fromTime} của địa điểm '${des.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

    if (!toTime.match(timeRegex) || toTime <= fromTime)
        throw new AppError(`Giờ kết thúc (HH:MM): ${toTime} của địa điểm '${des.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

    if (distance < 0)
        throw new AppError(`Khoảng cách đến địa điểm '${des.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

    if (timeTraveling < 0)
        throw new AppError(`Thời gian di chuyển đến địa điểm '${des.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

});
