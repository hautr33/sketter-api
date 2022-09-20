import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class DestinationRecommendedTime extends Model<InferAttributes<DestinationRecommendedTime>, InferCreationAttributes<DestinationRecommendedTime>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    start!: string;
    end!: string;
}

DestinationRecommendedTime.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    start: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: {
                msg: "Khung thời gian đề xuất không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    end: {
        type: DataTypes.STRING,
        allowNull: false,
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