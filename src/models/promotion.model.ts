import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { User } from './user.model';
import { StatusCodes } from 'http-status-codes';
import AppError from '../utils/app_error';

export class Promotion extends Model<InferAttributes<Promotion>, InferCreationAttributes<Promotion>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    name!: string;
    description?: string;
    quantity!: number;
    salePrice!: number;
    oldPrice!: number;
    salePercent?: number;
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
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập mô tả về khuyến mãi' },
            notEmpty: { msg: 'Vui lòng nhập mô tả về khuyến mãi' },
            len: { msg: 'Mô tả về khuyến mãi không quá 500 ký tự', args: [0, 500] }
        }
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
    salePrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá khuyến mãi' },
            isInt: { msg: 'Giá khuyến mãi không hợp lệ' },
            min: { msg: 'Giá khuyến mãi phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá khuyến mãi phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    oldPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá gốc' },
            isInt: { msg: 'Giá gốc không hợp lệ' },
            min: { msg: 'Giá gốc phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá gốc phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    salePercent: {
        type: DataTypes.INTEGER,
        validate: {
            isInt: { msg: 'Phần trăm giảm giá không hợp lệ' },
            min: { msg: 'Phần trăm giảm giá phải từ 1% đồng đến 99%', args: [1] },
            max: { msg: 'Phần trăm giảm giá phải từ 1% đồng đến 99%', args: [99] }
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
        allowNull: false,
        validate: {
            isIn: {
                args: [['Coupon', 'Voucher']],
                msg: 'Hình thức khuyến mãi không hợp lệ'
            }
        }
    },
    stastus: {
        type: DataTypes.STRING,
        defaultValue: Status.pending,
        validate: {
            isIn: {
                args: [[Status.pending, Status.activated, Status.cancel]],
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

Promotion.beforeSave(async (promotion) => {
    const { destinationID, salePrice, oldPrice, fromDate, toDate, promotionType } = promotion;

    const count = await Destination.count({ where: { id: destinationID, status: Status.activated } })
    if (count !== 1)
        throw new AppError('Địa điểm không hợp lệ', StatusCodes.BAD_REQUEST)

    if (toDate < fromDate)
        throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', StatusCodes.BAD_REQUEST)

    if (oldPrice < salePrice)
        throw new AppError('Giá khuyến mãi phải thấp hơn giá gốc', StatusCodes.BAD_REQUEST)
})