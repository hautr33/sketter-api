import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';

export class Voucher extends Model<InferAttributes<Voucher>, InferCreationAttributes<Voucher>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    name!: string;
    image!: string;
    description!: string;
    quantity!: number;
    totalSold?: number;
    value!: number;
    salePrice!: number;
    discountPercent!: number;
    fromDate!: Date;
    toDate!: Date;
    stastus?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

Voucher.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    destinationID: {
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
    image: {
        type: DataTypes.STRING
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
    totalSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    salePrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá bán' },
            isInt: { msg: 'Giá bán không hợp lệ' },
            min: { msg: 'Giá bán phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá bán phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá trị của voucher' },
            isInt: { msg: 'Giá trị của voucher không hợp lệ' },
            min: { msg: 'Giá trị của voucher phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá trị của voucher phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    discountPercent: {
        type: DataTypes.INTEGER
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
    stastus: {
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
    modelName: 'Voucher' // We need to choose the model name
});

Destination.hasMany(Voucher, { foreignKey: "destinationID", as: 'destinationApply' });
Voucher.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destinationApply' })

Voucher.beforeSave(async (voucher) => {
    const { value, salePrice
    } = voucher;
    if (value < salePrice)
        throw new AppError('Giá bán phải thấp hơn giá trị của voucher', StatusCodes.BAD_REQUEST)

    voucher.discountPercent = 100 - Math.round((salePrice / value) * 100)
})