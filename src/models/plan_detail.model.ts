import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDetail extends Model<InferAttributes<PlanDetail>, InferCreationAttributes<PlanDetail>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    date!: Date;
    stayDestinationID?: ForeignKey<Destination['id']>;
}

PlanDetail.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    planID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Ngày của lịch trình chi tiết không được trống' },
            notEmpty: { msg: 'Ngày của lịch trình chi tiết không được trống' }
        }
    },
    stayDestinationID: {
        type: DataTypes.UUID,
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDetail' // We need to choose the model name
});


// PlanDetail.hasMany(PlanDestination, { foreignKey: 'planDetailID', as: "destinations" })
// PlanDestination.belongsTo(PlanDetail, { foreignKey: 'planDetailID', as: "destinations" })

// Destination.hasMany(PlanDetail, { foreignKey: 'stayDestinationID', as: "stayDestination" })
// PlanDetail.belongsTo(Destination, { foreignKey: 'stayDestinationID', as: "stayDestination" })

// PlanDetail.beforeSave(async (planDetail) => {
//     if (planDetail.stayDestinationID && planDetail.stayDestinationID !== null) {
//         const stay = await Destination.findOne(
//             {
//                 where: { id: planDetail.stayDestinationID },
//                 attributes: ['id'],
//                 include: [
//                     {
//                         model: Catalog,
//                         where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] },
//                         as: 'catalogs',
//                         through: { attributes: [] },
//                         attributes: []
//                     }]
//             }
//         )
//         if (!stay || stay === null)
//             throw new AppError(`Địa điểm lưu trú của ngày ${planDetail.date} không hợp lệ`, StatusCodes.BAD_REQUEST)
//     }
// });
