import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class RecommendationTime extends Model<InferAttributes<RecommendationTime>, InferCreationAttributes<RecommendationTime>> {
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