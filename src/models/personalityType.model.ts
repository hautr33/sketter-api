import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

//     'Thích khám phá',
//     'Ưa mạo hiểm',
//     'Tìm kiếm sự thư giãn',
//     'Đam mê với ẩm thực',
//     'Đam mê với lịch sử, văn hóa',
//     'Yêu thiên nhiên',
//     'Giá rẻ là trên hết',
//     'Có nhu cầu vui chơi, giải trí cao'

export class TravelPersonalityType extends Model<InferAttributes<TravelPersonalityType>, InferCreationAttributes<TravelPersonalityType>> {
    declare name: string;
}

TravelPersonalityType.init({
    // Model attributes are defined here
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'TravelPersonalityType' // We need to choose the model name
});
