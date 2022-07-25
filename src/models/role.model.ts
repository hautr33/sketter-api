import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';

export interface RoleAttributes {
    id: number;
    name: string;
}

export interface RoleInput extends Optional<RoleAttributes, 'id'> { };
export interface RoleOuput extends Required<RoleAttributes> { };

export class Role extends Model<RoleAttributes, RoleInput> implements RoleAttributes {
    declare id: number;
    name!: string;
}

Role.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    // Other model options go here
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Role' // We need to choose the model name
});

