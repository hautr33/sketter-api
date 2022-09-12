import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { TravelPersonalityType } from './personality_type.model';

export class Destination_TravelPersonalityType extends Model<InferAttributes<Destination_TravelPersonalityType>, InferCreationAttributes<Destination_TravelPersonalityType>> { 
    destinationID!: ForeignKey<Destination['id']>;
    personalityName!: ForeignKey<TravelPersonalityType['name']>;
}

Destination_TravelPersonalityType.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_TravelPersonalityType' // We need to choose the model name
});