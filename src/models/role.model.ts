import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
    declare id: number;
    name!: string;
    description!: string;
}

Role.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            name: 'role-exist',
            msg: 'role-exist: Vai trò đã tồn tại'
        },
    },
    description: {
        type: DataTypes.STRING,
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Role' // We need to choose the model name
});

(async () => {
    const role = [
        [1, 'Admin', 'Quản trị viên'],
        [2, 'Manager', 'Quản lý'],
        [3, 'Supplier', 'Đối tác'],
        [4, 'Traveler', 'Khách du lịch'],
    ]
    for (let i = 0; i < role.length; i++) {
        await Role.upsert({ id: role[i][0] as number, name: role[i][1] as string, description: role[i][2] as string })
    }
})();