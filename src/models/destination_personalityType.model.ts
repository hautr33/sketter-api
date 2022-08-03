import { InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class Destination_TravelPersonalityType extends Model<InferAttributes<Destination_TravelPersonalityType>, InferCreationAttributes<Destination_TravelPersonalityType>> { }

Destination_TravelPersonalityType.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_TravelPersonalityType' // We need to choose the model name
});