import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Plan } from './plan.model';
import { TravelPersonalityType } from './personalityType.model';

export class Plan_TravelPersonalities extends Model<InferAttributes<Plan_TravelPersonalities>, InferCreationAttributes<Plan_TravelPersonalities>> {
    planID!: ForeignKey<Plan['id']>;
    personality!: ForeignKey<TravelPersonalityType['name']>;
}

Plan_TravelPersonalities.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Plan_TravelPersonalities' // We need to choose the model name
});