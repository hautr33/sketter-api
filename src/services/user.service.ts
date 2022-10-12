import { UserPrivateFields } from "../utils/private_field"
import { User } from "../models/user.model"
import { Roles, Status } from "../utils/constant"
import { Personalities } from "../models/personalities.model"
import { Role } from "../models/role.model"
import sequelizeConnection from "../db/sequelize.db"
import _ from "lodash"
import { getAuth } from "firebase-admin/auth"
import { sendEmail } from "./mail.service"

/**
 * This method get User's information
 *
 * @param {*} id ID of User
 */
export const getUserService = async (id: string) => {
    const user = await User.findByPk(
        id,
        {
            include: [
                { model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] },
                { model: Role, as: 'role', attributes: { exclude: ['id'] } }
            ]
        }
    )
    if (!user)
        return null
    return _.omit(user.toJSON(), UserPrivateFields[user.roleID ?? 0])
}

/**
 * This method update User's information
 *
 * @param {*} id ID of User
 * @param {*} body Body is some field to be update
 */
export const updateUserService = async (id: string, body: any) => {
    const user = await User.findByPk(id)
    if (!user)
        return null
    const { name, avatar, travelerPersonalities } = body;
    name ? user.name = name : 0
    avatar ? user.avatar = avatar : 0
    if (user.roleID == Roles.Traveler) {
        const { gender, dob, phone, address } = body;
        phone ? user.phone = phone : 0
        address ? user.address = address : 0
        gender ? user.gender = gender : 0
        dob ? user.dob = dob : 0
    } else if (user.roleID == Roles.Supplier) {
        const { owner, phone, address } = body;
        phone ? user.phone = phone : 0
        address ? user.address = address : 0
        owner ? user.owner = owner : 0
    }
    await sequelizeConnection.transaction(async (update) => {
        await user.save({ transaction: update })
        travelerPersonalities ? await user.setTravelerPersonalities(travelerPersonalities, { transaction: update }) : 0
    })
    return user
}

/**
 * This method update User's password
 *
 * @param {*} user User that change password
 * @param {*} newPassword New Password of User
 */
export const updateUserPasswordService = async (user: User, newPassword: string) => {
    await sequelizeConnection.transaction(async (update) => {
        user.password = newPassword
        user.passwordResetExpires = null
        user.passwordResetToken = null
        await user.save({ transaction: update })
        await getAuth().updateUser(user.firebaseID, { password: newPassword })
    })
}

/**
 * This method send email to verify User's account
 *
 * @param {*} user User that verify account
 */
export const sendVerifyEmailService = async (user: User) => {
    await sequelizeConnection.transaction(async (verify) => {
        const code = await user.createVerifyCode();
        await user.save({ transaction: verify });
        const message = `Xin chào ${user.name},\nVui lòng nhập code dưới đây vào thiết bị của bạn để xác thực email của bạn:
        \n${code}`;

        await sendEmail({
            email: user.email,
            subject: 'Sketter - Xác thực tài khoản (hết hạn sau 5 phút)',
            message
        });
    })
}

/**
 * This method verify User account
 *
 * @param {*} id ID of User
 */
export const verifyEmailService = async (id: string) => {
    await sequelizeConnection.transaction(async (verify) => {
        await User.update({ verifyCode: null, verifyCodeExpires: null, status: Status.verified }, { where: { id: id }, transaction: verify })
    })
}