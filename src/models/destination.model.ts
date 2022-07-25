import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
// import { TravelPersonalityType } from './personalityType.model';


export interface DestinationAttributes {
    id: string;
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
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    longitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    latitude: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lowestPrice: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    highestPrice: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    openingTime: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    closingTime: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    spendingTime: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    recommendationTimeFrom: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    recommendationTimeTo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    estimatedTimeStay: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rating: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    supplierID: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: 'Destination_Catalog' });
// Destination.belongsToMany(TravelPersonalityType, { through: 'Destination_TravelPersonality' });