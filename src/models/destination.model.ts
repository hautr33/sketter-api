import { DataTypes, ForeignKey, HasManyAddAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model, Op } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { DestinationCatalog } from './destination_catalog.model';
import { Personalities } from './personalities.model';
import { User } from './user.model';
import { DestinationRecommendedTime } from './destination_recommended_time.model';
import { DestinationImage } from './destination_image.model';
import { DestinationPersonalites } from './destination_personalities.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';

export class Destination extends Model<InferAttributes<Destination>, InferCreationAttributes<Destination>> {
    declare id?: string;
    name!: string;
    address!: string;
    phone?: string;
    email?: string;
    description!: string;
    image!: string;
    longitude!: number;
    latitude!: number;
    lowestPrice!: number;
    highestPrice!: number;
    openingTime!: string;
    closingTime!: string;
    estimatedTimeStay!: number;
    status?: string;
    avgRating?: number;
    view?: number;
    totalRating?: number;
    supplierID?: ForeignKey<User['id']> | null;
    createdBy!: ForeignKey<User['id']>;

    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    declare getCatalogs: HasManyGetAssociationsMixin<Catalog>;
    declare addCatalogs: HasManyAddAssociationsMixin<Catalog, string>;
    declare setCatalogs: HasManySetAssociationsMixin<Catalog, string>;

    declare getDestinationPersonalities: HasManyGetAssociationsMixin<Personalities>;
    declare addDestinationPersonalities: HasManyAddAssociationsMixin<Personalities, string>;
    declare setDestinationPersonalities: HasManySetAssociationsMixin<Personalities, string>;

    declare getRecommendedTimes: HasManyGetAssociationsMixin<DestinationRecommendedTime>;
    declare createRecommendedTime: HasManyCreateAssociationMixin<DestinationRecommendedTime, 'destinationID'>;

    declare getGallery: HasManyGetAssociationsMixin<DestinationImage>;
    declare createGallery: HasManyCreateAssociationMixin<DestinationImage, 'destinationID'>;
    destinationPersonalities?: any[];
    catalogs?: any[];
}

Destination.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên địa điểm' },
            notEmpty: { msg: 'Vui lòng nhập tên địa điểm' }
        }
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập địa chỉ' },
            notEmpty: { msg: 'Vui lòng nhập địa chỉ' }
        }
    },
    phone: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập mô tả địa điểm' },
            notEmpty: { msg: 'Vui lòng nhập mô tả địa điểm' }
        }
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng thêm ảnh vào địa điểm' },
            notEmpty: { msg: 'Vui lòng  thêm ảnh vào địa điểm' }
        }
    },
    longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập kinh độ' },
            notEmpty: { msg: 'Vui lòng nhập kinh độ' }
        }
    },
    latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập vĩ độ' },
            notEmpty: { msg: 'Vui lòng nhập vĩ độ' }
        }
    },
    lowestPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá thấp nhất' },
            notEmpty: { msg: 'Vui lòng nhập giá thấp nhất' }
        }
    },
    highestPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá cao nhất' },
            notEmpty: { msg: 'Vui lòng nhập giá cao nhất' }
        }
    },
    openingTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ mở cửa' },
            notEmpty: { msg: 'Vui lòng nhập giờ mở cửa' }
        }
    },
    closingTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ đóng cửa' },
            notEmpty: { msg: 'Vui lòng nhập giờ đóng cửa' }
        }
    },
    estimatedTimeStay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập thời gian tham quan' },
            notEmpty: { msg: 'Vui lòng nhập thời gian tham quan' }
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: Status.activated,
        validate: {
            isIn: {
                args: [[Status.activated, Status.inactivated, Status.deactivated, Status.closed]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    avgRating: {
        type: DataTypes.REAL,
        allowNull: false,
        defaultValue: 0.0
    },
    view: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    totalRating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    supplierID: {
        type: DataTypes.UUID,
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
}, {
    // Other model options go here
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: DestinationCatalog, foreignKey: "destinationID", as: 'catalogs' });
Catalog.belongsToMany(Destination, { through: DestinationCatalog, foreignKey: "catalogName", as: 'catalogs' });

Destination.belongsToMany(Personalities, { through: DestinationPersonalites, foreignKey: "destinationID", as: 'destinationPersonalities' });
Personalities.belongsToMany(Destination, { through: DestinationPersonalites, foreignKey: "personalityName", as: 'destinationPersonalities' });

Destination.hasMany(DestinationRecommendedTime, {
    foreignKey: "destinationID", as: 'recommendedTimes'
});

Destination.hasMany(DestinationImage, { foreignKey: "destinationID", as: 'gallery' });
DestinationImage.belongsTo(Destination, { foreignKey: "destinationID", as: 'gallery' });

User.hasMany(Destination, { foreignKey: "supplierID", as: "supplier" });
Destination.belongsTo(User, { foreignKey: 'supplierID', as: "supplier" });

User.hasMany(Destination, { foreignKey: "createdBy", as: "creater" });
Destination.belongsTo(User, { foreignKey: 'createdBy', as: "creater" })



Destination.beforeSave(async (destination) => {
    const timeRegex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g
    const { phone, email, longitude, latitude, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, supplierID
    } = destination;
    let err = null

    if (phone && phone !== null && !phone.match(phoneRegex))
        err = 'Số điện thoại không hợp lệ'

    else if (typeof longitude !== 'number' || longitude < -180 || longitude > 180)
        err = 'Kinh độ không hợp lệ'

    else if (typeof latitude !== 'number' || latitude < -90 || latitude > 90)
        err = 'Vĩ độ không hợp lệ'

    else if (typeof lowestPrice !== 'number' || lowestPrice < 0)
        err = 'Giá thấp nhất không hợp lệ'

    else if (typeof highestPrice !== 'number' || highestPrice < lowestPrice)
        err = 'Giá cao nhất không hợp lệ'

    else if (!openingTime.match(timeRegex))
        err = 'Giờ mở cửa không hợp lệ (HH:MM)'

    else if (!closingTime.match(timeRegex) || closingTime <= openingTime)
        err = 'Giờ đóng cửa không hợp lệ (HH:MM)'

    else if (typeof estimatedTimeStay !== 'number' || estimatedTimeStay < 0)
        err = 'Thời gian tham quan không hợp lệ'

    else if (email && email !== null)
        if (!email.match(emailRegex))
            err = 'Email không hợp lệ'
        else {
            const count = await Destination.count({ where: { email: email, supplierID: { [Op.ne]: supplierID ? supplierID : null } } })
            if (count > 0)
                err = 'Email đã được sử dụng bởi địa điểm của đối tác khác'
        }

    if (err !== null)
        throw new AppError(err, StatusCodes.BAD_REQUEST)
})