import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { TravelPersonalityType } from './personalityType.model';

export interface DestinationAttributes {
    id: string;
    name?: string;
    address?: string;
    longitude?: number;
    latitude?: number;
    lowestPrice?: number;
    highestPrice?: number;
    openingTime?: string;
    closingTime?: string;
    spendingTime: string;
    recommendationTimeFrom?: string;
    recommendationTimeTo?: string;
    estimatedTimeStay?: string;
    status?: string;
    rating?: number;
    supplierID: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DestinationInput extends Optional<DestinationAttributes, 'id'> { };
export interface DestinationOuput extends Required<DestinationAttributes> { };

export class Destination extends Model<DestinationAttributes, DestinationInput> implements DestinationAttributes {
    declare id: string;
    name!: string;
    address!: string;
    longitude!: number;
    latitude!: number;
    lowestPrice!: number;
    highestPrice!: number;
    openingTime!: string;
    closingTime!: string;
    spendingTime!: string;
    recommendationTimeFrom!: string;
    recommendationTimeTo!: string;
    estimatedTimeStay!: string;
    status!: string;
    rating!: number;
    supplierID!: string;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
}

Destination.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
    },
    longitude: {
        type: DataTypes.STRING,
    },
    latitude: {
        type: DataTypes.STRING,
    },
    lowestPrice: {
        type: DataTypes.STRING,
    },
    highestPrice: {
        type: DataTypes.STRING,
    },
    openingTime: {
        type: DataTypes.STRING,
    },
    closingTime: {
        type: DataTypes.STRING,
    },
    spendingTime: {
        type: DataTypes.STRING,
    },
    recommendationTimeFrom: {
        type: DataTypes.STRING,
    },
    recommendationTimeTo: {
        type: DataTypes.STRING,
    },
    estimatedTimeStay: {
        type: DataTypes.STRING,
    },
    status: {
        type: DataTypes.STRING,
    },
    rating: {
        type: DataTypes.STRING,
    },
    supplierID: {
        type: DataTypes.STRING,
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: 'Destination_Catalog' });
Destination.belongsToMany(TravelPersonalityType, { through: 'Destination_TravelPersonality' });

