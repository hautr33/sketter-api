import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

// const listCatalog: string[] = [
//     'Quán ăn',
//     'Quán cà phê',
//     'Địa điểm du lịch',
//     'Homestay',
//     'Khách sạn',
//     'Biệt thự',
//     'Khu nghỉ dưỡng cao cấp',
//     'Nhà xe'
// ]

export interface CatalogAttributes {
    id: number;
    name: string;
}

export interface CalalogInput extends Optional<CatalogAttributes, 'id'> { };
export interface CatalogOuput extends Required<CatalogAttributes> { };

export class Catalog extends Model<CatalogAttributes, CalalogInput> implements CatalogAttributes {
    declare id: number;
    name!: string;
}

Catalog.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Catalog' // We need to choose the model name
});
Catalog.belongsToMany(Destination, { through: 'Destination_Catalog' });