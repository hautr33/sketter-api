import bcrypt from 'bcryptjs';
import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../db/config.db';
import { ROLE } from '../config/constant'

export type Gender = 'Male' | 'Female';
export type RoleID = 1 | 2 | 3 | 4;
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
    roleID?: RoleID;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface UserInput extends Optional<UserAttributes, 'id' | 'email'> { };
export interface UserOuput extends Required<UserAttributes> { };

export class User extends Model<UserAttributes, UserInput> implements UserAttributes {
    declare id: string;
    email: string;
    password: string;
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
    roleID!: RoleID;
    readonly createdAt!: Date;
    readonly updatedAt!: Date;
    comparePassword: comparePasswordFunction;
}

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => void) => void;
User.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
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
        type: DataTypes.STRING(10)
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

User.beforeSave(async (user, options) => {
    if (user.changed("password")) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        user.password = hashedPassword;
        user.passwordUpdatedAt = new Date(Date.now() - 1000); // Now - 1 minutes
    }
});

// the defined model is the class itself
console.log(User === sequelize.models.User); // true