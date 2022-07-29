import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export interface RecommendationTimeAttributes {
    destinationID: number;
    from: string;
    to: string;
}

export interface RecommendationTimeInput extends Optional<RecommendationTimeAttributes, 'destinationID'> { };
export interface RecommendationTimeOuput extends Required<RecommendationTimeAttributes> { };

export class RecommendationTime extends Model<RecommendationTimeAttributes, RecommendationTimeInput> implements RecommendationTimeAttributes {
    declare destinationID: number;
    from!: string;
    to!: string;
}

RecommendationTime.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    from: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    to: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'RecommendationTime' // We need to choose the model name
});

Destination.hasOne(RecommendationTime, {
    foreignKey: "destinationID"
});