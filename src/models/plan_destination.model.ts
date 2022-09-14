import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
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
    distance: {
        type: DataTypes.REAL,
        allowNull: false,
        validate: {
            min: {
                msg: "Khoảng cách đến địa điểm này phải lớn hơn 0 km",
                args: [0]
            }
        }
    },
    timeTraveling: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                msg: "Thời gian di chuyển đến địa điểm này phải lớn hơn 0 phút",
                args: [0]
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
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDestination' // We need to choose the model name
});


Destination.hasMany(PlanDestination, { foreignKey: 'destinationID', as: 'destination' })
PlanDestination.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destination' })
