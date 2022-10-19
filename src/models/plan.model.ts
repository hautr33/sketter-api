import { DataTypes, ForeignKey, HasManyAddAssociationsMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import AppError from '../utils/app_error';
import sequelize from '../db/sequelize.db';
import { Personalities } from './personalities.model';
import { PlanDetail } from './plan_detail.model';
import { PlanPersonalities } from './plan_personalities.model';
import { User } from './user.model';
import { StatusCodes } from 'http-status-codes';

export class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
    declare id?: string;
    name!: string;
    fromDate!: Date;
    toDate!: Date;
    place!: string;
    estimatedCost!: number;
    isPublic!: boolean;
    status?: string;
    travelerID!: ForeignKey<User['id']>;

    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    declare getPlanPersonalities: HasManyGetAssociationsMixin<Personalities>;
    declare addPlanPersonalities: HasManyAddAssociationsMixin<Personalities, string>;
    declare setPlanPersonalities: HasManySetAssociationsMixin<Personalities, string>;
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
            notEmpty: { msg: 'Vui lòng chọn ngày bắt đầu' }
        }
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày kết thúc' },
            notEmpty: { msg: 'Vui lòng chọn ngày kết thúc' }
        }
    },
    place: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn tỉnh/thành phố lên lịch trình' },
            notEmpty: { msg: 'Vui lòng chọn tỉnh/thành phố lên lịch trình' }
        }
    },
    estimatedCost: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Chi phí dự tính không hợp lệ' },
            notEmpty: { msg: 'Chi phí dự tính không hợp lệ' }
        }
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
        defaultValue: 'Planning',
        validate: {
            isIn: {
                args: [['Draft', 'Planning', 'Active', 'Complete']],
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



Plan.belongsToMany(Personalities, { through: PlanPersonalities, foreignKey: "planID", as: "planPersonalities" });
Personalities.belongsToMany(Plan, { through: PlanPersonalities, foreignKey: "personalityName", as: "planPersonalities" });

Plan.hasMany(PlanDetail, { foreignKey: 'planID', as: "details" })
PlanDetail.belongsTo(Plan, { foreignKey: 'planID', as: "details" })

User.hasMany(Plan, { foreignKey: "travelerID", as: "traveler" });
Plan.belongsTo(User, { foreignKey: 'travelerID', as: "traveler" })


Plan.beforeSave(async (plan) => {
    if (plan.toDate < plan.fromDate)
        throw new AppError('Thời gian kết thúc không hợp lệ', StatusCodes.BAD_REQUEST)

    if (plan.estimatedCost < 0)
        throw new AppError('Chi phí dự tính không hợp lệ', StatusCodes.BAD_REQUEST)

});
