import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Personalities } from './personalities.model';
import { User } from './user.model';

export class TravelerPersonalities extends Model<InferAttributes<TravelerPersonalities>, InferCreationAttributes<TravelerPersonalities>> {
    userID!: ForeignKey<User['id']>;
    personality!: ForeignKey<Personalities['name']>;
}

TravelerPersonalities.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'TravelerPersonalities' // We need to choose the model name
});