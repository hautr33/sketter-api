import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class Destination_RecommendedTime extends Model<InferAttributes<Destination_RecommendedTime>, InferCreationAttributes<Destination_RecommendedTime>> {
    declare destinationID: ForeignKey<Destination['id']>;;
    start!: string;
    end!: string;
}

Destination_RecommendedTime.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    start: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    end: {
        type: DataTypes.STRING,
        primaryKey: true
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_RecommendedTime' // We need to choose the model name
});

Destination.hasMany(Destination_RecommendedTime, {
    foreignKey: "destinationID"
});