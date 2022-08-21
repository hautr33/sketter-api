import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class Destination_RecommendedTime extends Model<InferAttributes<Destination_RecommendedTime>, InferCreationAttributes<Destination_RecommendedTime>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    start!: string;
    end!: string;
}

Destination_RecommendedTime.init({
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
    },
    start: {
        type: DataTypes.STRING,
        validate: {
            is: {
                msg: "Khung thời gian đề xuất không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    end: {
        type: DataTypes.STRING,
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
    modelName: 'Destination_RecommendedTime' // We need to choose the model name
});


Destination.hasMany(Destination_RecommendedTime, {
    foreignKey: "destinationID"
});

export const validateRecommendedTime = function (
    recommendedTimes: Destination_RecommendedTime[]
) {

    if (!recommendedTimes || recommendedTimes.length == 0)
        return 'Khung thời gian đề xuất không được trống. '

    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
    let err = '';
    recommendedTimes.forEach(time => {
        if (!time.start.match(regex))
            err = `Giờ bắt đầu "${time.start}" của khung thời gian đề xuất không hợp lệ. `
        else if (!time.end.match(regex) || time.end < time.start)
            err = `Giờ kết thúc "${time.end}" của khung thời gian đề xuất không hợp lệ. `
    });

    return err;
};