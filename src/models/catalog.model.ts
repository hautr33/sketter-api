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
    
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
    readonly deletedAt?: Date | null;
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
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
    }

}, {
    // Other model options go here
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Catalog' // We need to choose the model name
});

Catalog.hasMany(Catalog, { foreignKey: 'parent', as: 'sub' });
