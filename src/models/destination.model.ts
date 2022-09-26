import { DataTypes, ForeignKey, HasManyAddAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { DestinationCatalog } from './destination_catalog.model';
import { Personalities } from './personalities.model';
import { User } from './user.model';
import { DestinationRecommendedTime } from './destination_recommended_time.model';
import { DestinationImage } from './destination_image.model';
import { DestinationPersonalites } from './destination_personalities.model';

export class Destination extends Model<InferAttributes<Destination>, InferCreationAttributes<Destination>> {
    declare id?: string;
    name!: string;
    address!: string;
    phone!: string;
    email!: string;
    description!: string;
    longitude!: number;
    latitude!: number;
    lowestPrice!: number;
    highestPrice!: number;
    openingTime!: string;
    closingTime!: string;
    estimatedTimeStay!: number;
    status?: string;
    rating?: number;
    view?: number;
    comment?: number;
    supplierID!: ForeignKey<User['id']>;
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

    declare getImages: HasManyGetAssociationsMixin<DestinationImage>;
    declare createImage: HasManyCreateAssociationMixin<DestinationImage, 'destinationID'>;
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
            notEmpty: {
                msg: 'Tên địa điểm không được trống'
            },
        }
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Địa chỉ không được trống'
            },
        }
    },
    phone: {
        type: DataTypes.STRING,
        validate: {
            is: {
                msg: "Số điện thoại không hợp lệ",
                args: /(84|0[3|5|7|8|9])+([0-9]{8})\b/g
            },
        }
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            notEmpty: {
                msg: 'Email không được trống'
            },
            isEmail: {
                msg: "Email không hợp lệ"
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        validate: {
            notEmpty: {
                msg: 'Mô tả địa điểm không được trống'
            },
        }
    },
    longitude: {
        type: DataTypes.REAL,
        validate: {
            notEmpty: {
                msg: 'Kinh độ không được trống'
            },
            min: -180,
            max: 180
        }
    },
    latitude: {
        type: DataTypes.REAL,
        validate: {
            notEmpty: {
                msg: 'Vĩ độ không được trống'
            },
            min: -90,
            max: 90
        }
    },
    lowestPrice: {
        type: DataTypes.INTEGER,
    },
    highestPrice: {
        type: DataTypes.INTEGER,
    },
    openingTime: {
        type: DataTypes.STRING,
        validate: {
            is: {
                msg: "Giờ mở cửa không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    closingTime: {
        type: DataTypes.STRING,
        validate: {
            is: {
                msg: "Giờ đóng cửa không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    estimatedTimeStay: {
        type: DataTypes.INTEGER,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: Status.unverified
    },
    rating: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    view: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    comment: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    supplierID: {
        type: DataTypes.UUID,
    },
    createdBy: {
        type: DataTypes.UUID,
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

Destination.hasMany(DestinationImage, {
    foreignKey: "destinationID", as: 'images'
});

User.hasMany(Destination, { foreignKey: "supplierID", as: "supplier" });
Destination.belongsTo(User, { foreignKey: 'supplierID', as: "supplier" });

User.hasMany(Destination, { foreignKey: "createdBy", as: "creater" });
Destination.belongsTo(User, { foreignKey: 'createdBy', as: "creater" })

Destination.beforeSave(async (destination) => {
    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g

    const count = await User.count({ where: { id: destination.supplierID } })
    if (count != 1)
        throw new Error('SupplierID không hợp lệ');

    if (destination.highestPrice < destination.lowestPrice)
        throw new Error('Giá cao nhất không hợp lệ');

    if (!destination.openingTime.match(regex))
        throw new Error('Giờ mở cửa không hợp lệ');

    if (!destination.closingTime.match(regex) || destination.closingTime < destination.openingTime)
        throw new Error('Giờ đóng cửa không hợp lệ');
})