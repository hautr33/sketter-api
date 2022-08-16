import bcrypt from 'bcryptjs';
import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Roles } from '../utils/constant';
import crypto from 'crypto';
import { Role } from './role.model';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: string;
    email!: string;
    password!: string;
    passwordUpdatedAt!: Date;
    passwordResetToken!: string | null;
    passwordResetExpires!: number | null;
    name!: string;
    avatar!: string | null;
    gender!: string;
    dob!: Date;
    phone!: string;
    address!: string;
    owner!: string;
    isActive!: boolean;
    roleID!: ForeignKey<Role['id']>;
    authType!: string;
    firebaseID!: string;
    comparePassword!: (candidatePassword: string) => Promise<any>;
    createResetPasswordToken!: () => Promise<string>;
    getavatarURL!: () => Promise<any>;

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
        unique: {
            name: 'email-exist',
            msg: 'Email đã được sử dụng bởi tài khoản khác'
        },
        validate: {
            notEmpty: {
                msg: 'Email không được trống'
            },
            isEmail: {
                msg: "Email không hợp lệ"
            }
        }
    },
    password: {
        type: DataTypes.STRING,
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
    avatar: {
        type: DataTypes.TEXT,
    },
    gender: {
        type: DataTypes.STRING,
        validate: {
            isIn: {
                args: [['Nam', 'Nữ']],
                msg: 'Giới tính không hợp lệ'
            }
        }
    },
    dob: {
        type: DataTypes.DATEONLY
    },
    phone: {
        type: DataTypes.STRING(10),
        unique: {
            name: 'phone-exist',
            msg: 'Số điện thoại đã được sử dụng bởi tài khoản khác'
        },
        validate: {
            is: /(84|0[3|5|7|8|9])+([0-9]{8})\b/g,
        }
    },
    address: {
        type: DataTypes.STRING
    },
    owner: {
        type: DataTypes.STRING
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    roleID: {
        type: DataTypes.INTEGER,
    },
    authType: {
        type: DataTypes.STRING,
        validate: {
            isIn: {
                args: [['Sketter', 'Google']],
                msg: 'Phương thức xác thực không hợp lệ'
            }
        },
        defaultValue: 'Sketter'
    },
    firebaseID: {
        type: DataTypes.STRING,
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize,
    modelName: 'User' // We need to choose the model name
});

Role.hasOne(User, {
    foreignKey: "roleID"
});

User.beforeSave(async (user) => {
    if (user.roleID == Roles.Supplier) {
        if (!user.name || user.name == '') {
            throw new Error('Supplier can not be blank');
        }
        if (!user.owner || user.owner == '') {
            throw new Error('Supplier\'s Owner can not be blank');
        }
        if (!user.phone || user.phone == '') {
            throw new Error('Supplier\'s Phone can not be blank');
        }
        if (!user.address || user.address == '') {
            throw new Error('Supplier\'s Address can not be blank');
        }
    }
    if (user.roleID == Roles.Traveler) {
        if (!user.name || user.name == '') {
            throw new Error('Traveler\'s Name can not be blank');
        }
    }
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