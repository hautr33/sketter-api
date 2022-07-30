import { InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class Destination_Catalog extends Model<InferAttributes<Destination_Catalog>, InferCreationAttributes<Destination_Catalog>> { }

Destination_Catalog.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_Catalog' // We need to choose the model name
});