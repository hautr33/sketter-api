import { StatusCodes } from 'http-status-codes';
import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import AppError from '../utils/app_error';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class DestinationRecommendedTime extends Model<InferAttributes<DestinationRecommendedTime>, InferCreationAttributes<DestinationRecommendedTime>> {
    destinationID!: ForeignKey<Destination['id']>;
    start!: string;
    end!: string;
}

DestinationRecommendedTime.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true,

    },
    start: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            notNull: { msg: 'Vui lòng nhập khoảng thời gian lý tưởng' },
            notEmpty: { msg: 'Vui lòng nhập khoảng thời gian lý tưởng' },
            is: {
                msg: "Khoảng thời gian lý tưởng không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            },
        }
    },
    end: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            notNull: { msg: 'Vui lòng nhập khoảng thời gian lý tưởng' },
            notEmpty: { msg: 'Vui lòng nhập khoảng thời gian lý tưởng' },
            is: {
                msg: "Khoảng thời gian lý tưởng không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationRecommendedTime' // We need to choose the model name
});



DestinationRecommendedTime.beforeSave(async (recommendedTime) => {
    const { start, end } = recommendedTime;

    if (start > end)
        throw new AppError(`Khung thời gian lý tưởng: ${start} - ${end} không hợp lệ`, StatusCodes.BAD_REQUEST)
})