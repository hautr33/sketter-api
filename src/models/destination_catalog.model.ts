import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { Destination } from './destination.model';

export class Destination_Catalog extends Model<InferAttributes<Destination_Catalog>, InferCreationAttributes<Destination_Catalog>> {
    destinationID!: ForeignKey<Destination['id']>;
    catalogName!: ForeignKey<Catalog['name']>;
}

Destination_Catalog.init({
    // Model attributes are defined here
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_Catalog' // We need to choose the model name
});