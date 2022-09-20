import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Personalities } from './personalites.model';

export class DestinationPersonalites extends Model<InferAttributes<DestinationPersonalites>, InferCreationAttributes<DestinationPersonalites>> {
    destinationID!: ForeignKey<Destination['id']>;
    personalityName!: ForeignKey<Personalities['name']>;
    planCount!: number | 0;
    visitCount!: number | 0;
}

DestinationPersonalites.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    personalityName: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    planCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    visitCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationPersonalites' // We need to choose the model name
});