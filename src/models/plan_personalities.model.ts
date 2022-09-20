import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Plan } from './plan.model';
import { Personalities } from './personalites.model';

export class PlanPersonalities extends Model<InferAttributes<PlanPersonalities>, InferCreationAttributes<PlanPersonalities>> {
    planID!: ForeignKey<Plan['id']>;
    personality!: ForeignKey<Personalities['name']>;
}

PlanPersonalities.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanPersonalities' // We need to choose the model name
});