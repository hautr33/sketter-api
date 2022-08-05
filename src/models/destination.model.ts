import { DataTypes, ForeignKey, HasManyAddAssociationMixin, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { Destination_Catalog } from './destination_catalog.model';
import { Destination_TravelPersonalityType } from './destination_personalityType.model';
import { TravelPersonalityType } from './personalityType.model';
import { User } from './user.model';

export class Destination extends Model<InferAttributes<Destination>, InferCreationAttributes<Destination>> {
    declare id?: string;
    declare addCatalog: HasManyAddAssociationMixin<Catalog, number>;
    declare addTravelPersonalityType: HasManyAddAssociationMixin<TravelPersonalityType, number>;
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
    supplierID!: ForeignKey<Destination['id']>;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
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
        type: DataTypes.STRING,
        validate: {
            notEmpty: {
                msg: 'Mô tả địa điểm không được trống'
            },
        }
    },
    longitude: {
        type: DataTypes.FLOAT,
        validate: {
            notEmpty: {
                msg: 'Kinh độ không được trống'
            },
        }
    },
    latitude: {
        type: DataTypes.FLOAT,
        validate: {
            notEmpty: {
                msg: 'Vĩ độ không được trống'
            },
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
        type: DataTypes.STRING,
    },
    supplierID: {
        type: DataTypes.UUID,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: Destination_Catalog });
Catalog.belongsToMany(Destination, { through: Destination_Catalog });

Destination.belongsToMany(TravelPersonalityType, { through: Destination_TravelPersonalityType });
TravelPersonalityType.belongsToMany(Destination, { through: Destination_TravelPersonalityType });

User.hasOne(Destination, {
    foreignKey: "supplierID"
});