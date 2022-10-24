import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { User } from './user.model';

export class Promotion extends Model<InferAttributes<Promotion>, InferCreationAttributes<Promotion>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    name!: string;
    description!: string;
    quantity!: number;
    fromDate!: Date;
    toDate!: Date;
    promotionType!: string;
    stastus?: string;
    supplierID!: ForeignKey<User['id']>;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

Promotion.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    supplierID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên khuyến mãi' },
            notEmpty: { msg: 'Vui lòng nhập tên khuyến mãi' },
            len: { msg: 'Tên khuyến mãi phải có từ 2 đến 50 ký tự', args: [2, 50] }
        }
    },
    description: {
        type: DataTypes.TEXT,
        validate: {
            len: { msg: 'Mô tả về khuyến mãi không quá 500 ký tự', args: [0, 500] }
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập số lượng khuyến mãi' },
            isInt: { msg: 'Số lượng khuyến mãi không hợp lệ' },
            min: { msg: 'Giá thấp nhất không hợp lệ', args: [1] },
            max: { msg: 'Giá thấp nhất không hợp lệ', args: [999] }
        }
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày bắt đầu' },
            notEmpty: { msg: 'Vui lòng chọn ngày bắt đầu' }
        }
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày kết thúc' },
            notEmpty: { msg: 'Vui lòng chọn ngày kết thúc' }
        }
    },
    promotionType: {
        type: DataTypes.STRING,
    },
    stastus: {
        type: DataTypes.STRING,
        defaultValue: Status.activated,
        validate: {
            isIn: {
                args: [[Status.activated, Status.deactivated]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATEONLY,
        defaultValue: Date.now()
    },
    updatedAt: {
        type: DataTypes.DATEONLY,
        defaultValue: Date.now()
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Promotion' // We need to choose the model name
});