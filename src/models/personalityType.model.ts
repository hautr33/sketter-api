import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';

// const listTravelPersonalityType: string[] = [
//     'Thích khám phá',
//     'Ưa mạo hiểm',
//     'Tìm kiếm sự thư giãn',
//     'Đam mê với ẩm thực',
//     'Đam mê với lịch sử, văn hóa',
//     'Yêu thiên nhiên',
//     'Giá rẻ là trên hết',
//     'Có nhu cầu vui chơi, giải trí cao'
// ]

export interface TravelPersonalityTypeAttributes {
    id: string;
    name: string;
}

export interface TravelPersonalityTypeInput extends Optional<TravelPersonalityTypeAttributes, 'id'> { };
export interface TravelPersonalityTypeOuput extends Required<TravelPersonalityTypeAttributes> { };

export class TravelPersonalityType extends Model<TravelPersonalityTypeAttributes, TravelPersonalityTypeInput> implements TravelPersonalityTypeAttributes {
    declare id: string;
    name!: string;
}

TravelPersonalityType.init({
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
    modelName: 'TravelPersonalityType' // We need to choose the model name
});