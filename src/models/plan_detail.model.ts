import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDetail extends Model<InferAttributes<PlanDetail>, InferCreationAttributes<PlanDetail>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    destinationID!: ForeignKey<Destination['id']>;
    date?: Date;
    fromTime?: string;
    toTime?: string;
    checkinTime?: Date;
    checkoutTime?: Date;

}

PlanDetail.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    planID: {
        type: DataTypes.UUID
    },
    destinationID: {
        type: DataTypes.UUID
    },
    date: {
        type: DataTypes.DATEONLY,
    },
    fromTime: {
        type: DataTypes.STRING,
        validate: {
            is: {
                msg: "Giờ bắt đầu không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    toTime: {
        type: DataTypes.STRING,
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
    modelName: 'PlanDetail' // We need to choose the model name
});


Destination.hasOne(PlanDetail, { foreignKey: 'destinationID' })