import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDetail extends Model<InferAttributes<PlanDetail>, InferCreationAttributes<PlanDetail>> {
    planID!: ForeignKey<Plan['id']>;;
    destinationID!: ForeignKey<Destination['id']>;;
    date!: Date;
    fromTime!: string;
    toTime!: string;
    checkinTime?: Date;
    checkoutTime?: Date;
}

PlanDetail.init({
    // Model attributes are defined here
    planID: {
        type: DataTypes.UUID
    },
    destinationID: {
        type: DataTypes.UUID
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    fromTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: {
                msg: "Giờ bắt đầu không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    toTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: {
                msg: "Giờ kết thúc không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
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
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Plan' // We need to choose the model name
});