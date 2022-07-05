import bcrypt from 'bcryptjs';
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../db/sequelize.db';
import { ROLE } from '../utils/constant.util'

export type Gender = 'Male' | 'Female';
export type UserRole = 1 | 2 | 3 | 4;

export const privateFields = [
    "password",
    "passwordResetToken",
    "isActive"
];

export interface UserAttributes {
    id: string;
    email: string;
    password: string;
    passwordUpdatedAt?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    name?: string;
    image?: string;
    gender?: Gender;
    dob?: Date;
    phone?: string;
    address?: string;
    owner?: string;
    taxCode?: string;
    isActive?: boolean;
    roleID?: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface UserInput extends Optional<UserAttributes, 'id' | 'email'> { };
export interface UserOuput extends Required<UserAttributes> { };

export class User extends Model<UserAttributes, UserInput> implements UserAttributes {
    declare id: string;
    email!: string;
    password!: string;
    passwordUpdatedAt!: Date;
    passwordResetToken!: string;
    passwordResetExpires!: Date;
    name!: string;
    image!: string;
    gender!: Gender;
    dob!: Date;
    phone!: string;
    address!: string;
    owner!: string;
    taxCode!: string;
    isActive!: boolean;
    roleID!: UserRole;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
    checkCorrectness!: (candidatePassword: string) => Promise<any>;
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
        type: DataTypes.STRING,
    },
    passwordResetToken: {
        type: DataTypes.STRING,
    },
    passwordResetExpires: {
        type: DataTypes.DATE,
    },
    name: {
        type: DataTypes.STRING,
    },
    image: {
        type: DataTypes.STRING,
    },
    gender: {
        type: DataTypes.STRING
    },
    dob: {
        type: DataTypes.DATEONLY
    },
    phone: {
        type: DataTypes.STRING(10),
        unique: true
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
        defaultValue: ROLE.TRAVELER
    },
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

User.prototype.checkCorrectness = async function (
    candidatePassword: string,
) {
    // 'This point' to the current password
    return await bcrypt.compare(candidatePassword, this.password);
};