import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { User } from './user.model';

export class DestinationRating extends Model<InferAttributes<DestinationRating>, InferCreationAttributes<DestinationRating>> {
    destinationID!: ForeignKey<Destination['id']>;
    userID!: ForeignKey<User['id']>;
    star!: number;
    description!: string;
    stastus?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

DestinationRating.init({
    // Model attributes are defined here
    userID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    star: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    stastus: {
        type: DataTypes.STRING,
        defaultValue: Status.activated,
        validate: {
            isIn: {
                args: [[Status.activated, Status.deactivated]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATEONLY,
        defaultValue: Date.now()
    },
    updatedAt: {
        type: DataTypes.DATEONLY,
        defaultValue: Date.now()
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationRating' // We need to choose the model name
});

Destination.hasMany(DestinationRating, { foreignKey: "destinationID", as: "ratings" });
DestinationRating.belongsTo(Destination, { foreignKey: 'destinationID', as: "ratings" })

User.hasMany(DestinationRating, { foreignKey: "userID", as: "ratingBy" });
DestinationRating.belongsTo(User, { foreignKey: 'userID', as: "ratingBy" })