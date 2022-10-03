import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class DestinationRecommendedTime extends Model<InferAttributes<DestinationRecommendedTime>, InferCreationAttributes<DestinationRecommendedTime>> {
    destinationID!: ForeignKey<Destination['id']>;
    start!: string;
    end!: string;
}

DestinationRecommendedTime.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID, 
        primaryKey: true,

    },
    start: {
        type: DataTypes.STRING,
        primaryKey: true,
        validate: {
            is: {
                msg: "Khung thời gian đề xuất không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    end: {
        type: DataTypes.STRING,
        primaryKey: true,
        validate: {
            is: {
                msg: "Khung thời gian đề xuất không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationRecommendedTime' // We need to choose the model name
});