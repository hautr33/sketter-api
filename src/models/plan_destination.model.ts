import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDestination extends Model<InferAttributes<PlanDestination>, InferCreationAttributes<PlanDestination>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    destinationID!: ForeignKey<Destination['id']>;
    date!: Date;
    fromTime!: Date;
    toTime!: Date;
    distance!: number;
    duration!: number;
    profile !: string;
    distanceText !: string;
    durationText !: string;
    status?: string;
    destinationName?: string;
    destinationImage?: string;
    checkinTime?: Date;
    checkoutTime?: Date;
    rating?: number;
    description?: string;
}

PlanDestination.init({
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
            isDate: { msg: 'Ngày không hợp lệ', args: true }
        }
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    fromTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    toTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    distance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Khoảng cách đến địa điểm không được trống' },
            isInt: { msg: 'Khoảng cách đến địa điểm không hợp lệ' }
        }
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Thời gian di chuyển đến địa điểm không được trống' },
            isInt: { msg: 'Thời gian di chuyển đến địa điểm không hợp lệ' }
        }
    },
    profile: {
        type: DataTypes.STRING,
        defaultValue:'driving'
    },
    distanceText: {
        type: DataTypes.STRING,
        allowNull: false
    },
    durationText: {
        type: DataTypes.STRING,
        allowNull: false
    },
    checkinTime: {
        type: DataTypes.DATE,
        validate: {
            isDate: { msg: 'Thời gian đến địa điểm không hợp lệ', args: true }
        }
    },
    checkoutTime: {
        type: DataTypes.DATE,
        validate: {
            isDate: { msg: 'Thời gian rời địa điểm không hợp lệ', args: true }
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Planned',
        validate: {
            isIn: {
                args: [['Planned', 'Checked-in', 'New']],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDestination' // We need to choose the model name
});


Destination.hasMany(PlanDestination, { foreignKey: 'destinationID', as: 'destination' })
PlanDestination.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destination' })

PlanDestination.beforeSave(async () => {

});