import {
    DataTypes,
    ForeignKey,
    HasManyAddAssociationsMixin,
    HasManyGetAssociationsMixin,
    HasManySetAssociationsMixin,
    InferAttributes,
    InferCreationAttributes,
    Model
} from 'sequelize';
import sequelize from '../db/sequelize.db';
import { TravelPersonalityType } from './personality_type.model';
import { PlanDetail } from './plan_detail.model';
import { Plan_TravelPersonalities } from './plan_personalities.model';
import { User } from './user.model';

export class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
    declare id?: string;
    name!: string;
    fromDate!: Date;
    toDate!: Date;
    place?: string;
    estimatedCost!: number;
    isPublic!: boolean;
    isActive?: boolean;
    travelerID!: ForeignKey<User['id']>;

    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    declare getPlanPersonalities: HasManyGetAssociationsMixin<TravelPersonalityType>;
    declare addPlanPersonalities: HasManyAddAssociationsMixin<TravelPersonalityType, string>;
    declare setPlanPersonalities: HasManySetAssociationsMixin<TravelPersonalityType, string>;
    planPersonalities?: any[];

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
            notEmpty: {
                msg: 'Tên lịch trình không được trống'
            },
        }
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Ngày bắt đầu không được trốngF'
            },
        }
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Ngày kết thúc không được trốngF'
            }
        }
    },
    place: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Đà Lạt',
        validate: {
            notEmpty: {
                msg: 'Địa điểm lên lịch trình không được trốngF'
            },
        }
    },
    estimatedCost: {
        type: DataTypes.INTEGER
    },
    isPublic: {
        type: DataTypes.BOOLEAN
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    travelerID: {
        type: DataTypes.UUID
    },
}, {
    // Other model options go here
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Plan' // We need to choose the model name
});



Plan.belongsToMany(TravelPersonalityType, { through: Plan_TravelPersonalities, foreignKey: "planID", as: "planPersonalities" });
TravelPersonalityType.belongsToMany(Plan, { through: Plan_TravelPersonalities, foreignKey: "personalityName", as: "planPersonalities" });

Plan.hasMany(PlanDetail, { foreignKey: 'planID', as: "details" })
PlanDetail.belongsTo(Plan, { foreignKey: 'planID', as: "details" })

User.hasMany(Plan, { foreignKey: "travelerID", as: "traveler" });
Plan.belongsTo(User, { foreignKey: 'travelerID', as: "traveler" })


Plan.beforeSave(async (plan) => {
    if (plan.toDate < plan.fromDate)
        throw new Error('Ngày kết thúc không hợp lệ');

});
