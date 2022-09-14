import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Plan } from './plan.model';
import { PlanDestination } from './plan_destination.model';

export class PlanDetail extends Model<InferAttributes<PlanDetail>, InferCreationAttributes<PlanDetail>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    date!: Date;
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDetail' // We need to choose the model name
});


PlanDetail.hasMany(PlanDestination, { foreignKey: 'planDetailID', as: "destinations" })
PlanDestination.belongsTo(PlanDetail, { foreignKey: 'planDetailID', as: "destinations" })