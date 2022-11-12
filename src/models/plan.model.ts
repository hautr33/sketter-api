import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import AppError from '../utils/app_error';
import sequelize from '../db/sequelize.db';
import { User } from './user.model';
import { StatusCodes } from 'http-status-codes';
import { Destination } from './destination.model';
import { PlanDestination } from './plan_destination.model';

export class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
    declare id?: string;
    name!: string;
    fromDate!: Date;
    toDate!: Date;
    stayDestinationID?: ForeignKey<Destination['id']>;
    estimatedCost?: number;
    isPublic!: boolean;
    status?: string;
    travelerID!: ForeignKey<User['id']>;

    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    planPersonalities?: any[];
    destinations?: any[];
    details?: any[];

}

Plan.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên lịch trình' },
            notEmpty: { msg: 'Vui lòng nhập tên lịch trình' }
        }
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày bắt đầu' },
            notEmpty: { msg: 'Vui lòng chọn ngày bắt đầu' },
            isDate: { msg: 'Ngày bắt đầu không hợp lệ', args: true }
        }
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày kết thúc' },
            notEmpty: { msg: 'Vui lòng chọn ngày kết thúc' },
            isDate: { msg: 'Ngày kết thúc không hợp lệ', args: true }
        }
    },
    stayDestinationID: {
        type: DataTypes.UUID,
        validate: {
            isUUID: 4
        }
    },
    estimatedCost: {
        type: DataTypes.DOUBLE,
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn công khai/không công khai lịch trình' },
            notEmpty: { msg: 'Vui lòng chọn công khai/không công khai lịch trình' }
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Draft',
        validate: {
            isIn: {
                args: [['Draft', 'Planned', 'Activated', 'Completed']],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    travelerID: {
        type: DataTypes.UUID,
        allowNull: false
    },
}, {
    // Other model options go here
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Plan' // We need to choose the model name
});

Plan.hasMany(PlanDestination, { foreignKey: 'planID', as: "details" })
PlanDestination.belongsTo(Plan, { foreignKey: 'planID', as: "details" })

User.hasMany(Plan, { foreignKey: "travelerID", as: "traveler" });
Plan.belongsTo(User, { foreignKey: 'travelerID', as: "traveler" })

Destination.hasMany(Plan, { foreignKey: "stayDestinationID", as: "stayDestination" });
Plan.belongsTo(Destination, { foreignKey: 'stayDestinationID', as: "stayDestination" })

Destination.belongsToMany(Plan, { through: PlanDestination, foreignKey: "destinationID", as: 'destinations' });
Plan.belongsToMany(Destination, { through: PlanDestination, foreignKey: "planID", as: 'destinations' });

Plan.beforeSave(async (plan) => {
    if (plan.toDate < plan.fromDate)
        throw new AppError('Ngày kết thúc không hợp lệ', StatusCodes.BAD_REQUEST)
});
