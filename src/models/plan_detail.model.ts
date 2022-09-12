import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDetail extends Model<InferAttributes<PlanDetail>, InferCreationAttributes<PlanDetail>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    destinationID!: ForeignKey<Destination['id']>;
    date!: Date;
    fromTime!: string;
    toTime!: string;
    distance!: number;
    timeTraveling!: number;
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
        type: DataTypes.UUID,
        allowNull: false,
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false,
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
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDetail' // We need to choose the model name
});


Destination.hasMany(PlanDetail, { foreignKey: 'destinationID', as: 'destination' })
PlanDetail.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destination' })
