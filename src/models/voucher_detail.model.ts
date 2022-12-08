import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { User } from './user.model';
import { Voucher } from './voucher.model';

export class VoucherDetail extends Model<InferAttributes<VoucherDetail>, InferCreationAttributes<VoucherDetail>> {
    declare id?: string;
    voucherID!: ForeignKey<Voucher['id']>;
    travelerID!: ForeignKey<User['id']>;
    price!: number;
    quantity!: number;
    totalPrice!: number;
    status?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

VoucherDetail.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    voucherID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    travelerID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập số lượng khuyến mãi' },
            isInt: { msg: 'Số lượng khuyến mãi không hợp lệ' },
            min: { msg: 'Số lượng khuyến mãi phải từ 1 đến 99999', args: [1] },
            max: { msg: 'Số lượng khuyến mãi phải từ 1 đến 99999', args: [99999] }
        }
    },
    totalPrice: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: Status.draft,
        validate: {
            isIn: {
                args: [[Status.draft, Status.activated]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'VoucherDetail' // We need to choose the model name
});