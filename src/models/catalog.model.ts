import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

//     'Quán ăn',
//     'Quán cà phê',
//     'Địa điểm du lịch',
//     'Homestay',
//     'Khách sạn',
//     'Biệt thự',
//     'Khu nghỉ dưỡng cao cấp',
//     'Nhà xe'

export class Catalog extends Model<InferAttributes<Catalog>, InferCreationAttributes<Catalog>> {
    declare name: string;
    declare parent: ForeignKey<Catalog['name']> | null;
}

Catalog.init({
    // Model attributes are defined here
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    parent: {
        type: DataTypes.STRING
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Catalog' // We need to choose the model name
});

Catalog.hasMany(Catalog, { foreignKey: 'parent', as: 'sub' });
