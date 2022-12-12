import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { VoucherDetail } from './voucher_detail.model';
import { User } from './user.model';

export class Transaction extends Model<InferAttributes<Transaction>, InferCreationAttributes<Transaction>> {
    declare id?: string;
    voucherDetailID!: ForeignKey<VoucherDetail['id']>;
    travelerID!: ForeignKey<User['id']>;
    orderID!: string;
    orderInfo!: string;
    amount!: number;
    vnpTransactionNo?: string;
    vnpTransactionStatus?: string;
    transactionType?: string;
    status?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

Transaction.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    voucherDetailID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    orderID: {
        type: DataTypes.STRING,
        allowNull: false
    },
    orderInfo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    vnpTransactionNo: {
        type: DataTypes.STRING
    },
    vnpTransactionStatus: {
        type: DataTypes.STRING
    },
    transactionType: {
        type: DataTypes.STRING,
        defaultValue: 'Order',
        validate: {
            isIn: {
                args: [["Payment", "Refund", "Order"]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: Status.processing,
        validate: {
            isIn: {
                args: [[Status.processing, Status.success, Status.failed]],
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
    modelName: 'Transaction' // We need to choose the model name
});