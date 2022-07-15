import bcrypt from 'bcryptjs';
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Auth, Gender, Role } from '../utils/constant';
import crypto from 'crypto';

export type UserGender = 'Male' | 'Female';
export type UserRole = 1 | 2 | 3 | 4;
export type AuthType = 'Sketter' | 'Google';

export const defaultPrivateFields = [
    "password",
    "passwordResetToken",
    "passwordResetExpires",
    "passwordUpdatedAt",
    "gender",
    "dob",
    "owner",
    "taxCode",
    "createdAt",
    "isActive",
    "authType",
    "firebaseID",
    "createdAt",
    "updatedAt"
];

export const travelerPrivateFields = [
    "password",
    "passwordResetToken",
    "passwordResetExpires",
    "passwordUpdatedAt",
    "owner",
    "taxCode",
    "createdAt",
    "isActive",
    "authType",
    "firebaseID",
    "createdAt",
    "updatedAt"
];

export const supplierPrivateFields = [
    "password",
    "passwordResetToken",
    "passwordResetExpires",
    "passwordUpdatedAt",
    "gender",
    "dob",
    "createdAt",
    "isActive",
    "authType",
    "firebaseID",
    "createdAt",
    "updatedAt"
];

export interface UserAttributes {
    id: string;
    email: string;
    password: string;
    passwordUpdatedAt?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: number;
    name?: string;
    image?: string;
    gender: UserGender;
    dob?: Date;
    phone?: string;
    address?: string;
    owner?: string;
    taxCode?: string;
    isActive?: boolean;
    roleID: UserRole;
    authType: AuthType;
    firebaseID?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserInput extends Optional<UserAttributes, 'id' | 'email'> { };
export interface UserOuput extends Required<UserAttributes> { };

export class User extends Model<UserAttributes, UserInput> implements UserAttributes {
    declare id: string;
    email!: string;
    password!: string;
    passwordUpdatedAt!: Date;
    passwordResetToken: string | undefined;
    passwordResetExpires: number | undefined;
    name!: string;
    image!: string;
    gender!: UserGender;
    dob!: Date;
    phone!: string;
    address!: string;
    owner!: string;
    taxCode!: string;
    isActive!: boolean;
    roleID!: UserRole;
    authType!: AuthType;
    firebaseID!: string;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
    comparePassword!: (candidatePassword: string) => Promise<any>;
    createResetPasswordToken!: () => Promise<string>;
}

User.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: {
                msg: 'Please enter Email'
            },
            isEmail: {
                msg: "Invalid Email"
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Please enter Password'
            },
        }
    },
    passwordUpdatedAt: {
        type: DataTypes.DATE
    },
    passwordResetToken: {
        type: DataTypes.STRING
    },
    passwordResetExpires: {
        type: DataTypes.DATE
    },
    name: {
        type: DataTypes.STRING
    },
    image: {
        type: DataTypes.STRING
    },
    gender: {
        type: DataTypes.STRING,
        validate: {
            checkGender() {
                if (this.gender != Gender.female && this.gender != Gender.male) {
                    throw new Error('Invalid Gender');
                }
            }
        }
    },
    dob: {
        type: DataTypes.DATEONLY
    },
    phone: {
        type: DataTypes.STRING(10),
        unique: true,
        validate: {
            is: /(84|0[3|5|7|8|9])+([0-9]{8})\b/g
        }
    },
    address: {
        type: DataTypes.STRING
    },
    owner: {
        type: DataTypes.STRING
    },
    taxCode: {
        type: DataTypes.STRING(14)
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    roleID: {
        type: DataTypes.INTEGER,
        defaultValue: Role.traveler,
        validate: {
            checkRole() {
                if (this.roleID == Role.supplier) {
                    if (!this.name || this.name == '') {
                        throw new Error('Supplier\'s Name can not be blank');
                    }
                    if (!this.owner || this.owner == '') {
                        throw new Error('Supplier\'s Owner can not be blank');
                    }
                    if (!this.phone || this.phone == '') {
                        throw new Error('Supplier\'s Phone can not be blank');
                    }
                    if (!this.address || this.address == '') {
                        throw new Error('Supplier\'s Address can not be blank');
                    }
                    if (!this.taxCode || this.taxCode == '') {
                        throw new Error('Supplier\'s Tax Code can not be blank');
                    }
                }
                if (this.roleID == Role.traveler) {
                    if (!this.name || this.name == '') {
                        throw new Error('Traveler\'s Name can not be blank');
                    }
                }
            }
        }
    },
    authType: {
        type: DataTypes.STRING,
        defaultValue: Auth.sketter
    },
    firebaseID: {
        type: DataTypes.STRING,
    }
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'User' // We need to choose the model name
});


User.beforeSave(async (user) => {
    if (user.changed("password")) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        user.password = hashedPassword;
        user.passwordUpdatedAt = new Date(Date.now() - 1000); // Now - 1 minutes
    }
});

User.prototype.comparePassword = async function (
    candidatePassword: string,
) {
    // 'This point' to the current password
    return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.createResetPasswordToken = async function () {
    // 'This point' to the current password
    // Create a random 32 bytes as HEX (unhashed)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hashing the resetToken with SHA256 as HEX and store to database
    this.passwordResetToken = crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // 10 min expire
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // Return the UNHASHED token, we need to hash and compare when have this
    return resetToken;
};