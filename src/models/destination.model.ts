import { DataTypes, HasManyAddAssociationMixin, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { Destination_Catalog } from './destination_catalog.model';

export class Destination extends Model<InferAttributes<Destination>, InferCreationAttributes<Destination>> {
    declare id?: string;
    declare addCatalog: HasManyAddAssociationMixin<Catalog, number>;
    name!: string;
    address!: string;
    phone!: string;
    email!: string;
    description!: string;
    longitude!: number;
    latitude!: number;
    lowestPrice!: number;
    highestPrice!: number;
    openingTime!: string;
    closingTime!: string;
    estimatedTimeStay?: string;
    status?: string;
    rating?: number;
    supplierID?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
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
    phone: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
    },
    description: {
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
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: Destination_Catalog });
Catalog.belongsToMany(Destination, { through: Destination_Catalog });
// Destination.hasMany(TravelPersonalityType, { through: 'Destination_TravelPersonality' });

