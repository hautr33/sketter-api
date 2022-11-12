import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class TimeFrame extends Model<InferAttributes<TimeFrame>, InferCreationAttributes<TimeFrame>> {
    declare id: number;
    declare from: string;
    declare to: string;
}

TimeFrame.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    from: {
        type: DataTypes.STRING(5),
    },
    to: {
        type: DataTypes.STRING(5),
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'TimeFrame' // We need to choose the model name
});


// (async () => {
//     for (let i = 1; i <= 12; i++) {
//         const id = i
//         const from = (i - 1) * 2 >= 10 ? (i - 1) * 2 + ':00' : '0' + (i - 1) * 2 + ':00'
//         const to = i * 2 >= 10 ? i * 2 + ':00' : '0' + i * 2 + ':00'
//         await TimeFrame.upsert({ id: id, from: from, to: to })
//     }
// });