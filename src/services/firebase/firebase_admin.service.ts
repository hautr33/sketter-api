import { getAuth } from "firebase-admin/auth";
import { Auth, Roles, Status } from "../../utils/constant";
import { User } from "../../models/user.model";
import sequelizeConnection from "../../db/sequelize.db";
import AppError from "../../utils/app_error";
import { StatusCodes } from "http-status-codes";

export const signUpFirebase = async (user: User): Promise<any> => {
    await sequelizeConnection.transaction(async (create) => {
        await getAuth()
            .createUser({
                email: user.email,
                password: user.password
            })
            .then(async (userRecord: { uid: string; }) => {
                user.firebaseID = userRecord.uid
                await user.save({ transaction: create });
            })
    })
}

export const loginViaGoogle = async (token: string): Promise<any> => {
    await sequelizeConnection.transaction(async (save) => {
        await getAuth()
            .verifyIdToken(token)
            .then(async (decodedToken: any) => {
                const user = await User.findOne({ where: { email: decodedToken.email, firebaseID: decodedToken.uid } })
                if (!user) {
                    const user = new User()
                    user.email = decodedToken.email
                    user.firebaseID = decodedToken.uid
                    user.name = decodedToken.name
                    user.avatar = decodedToken.picture
                    user.authType = Auth.google
                    user.roleID = Roles.Traveler
                    user.status = Status.verified
                    await user.save({ transaction: save })
                    return user
                } else if (user.status !== Status.deactivated) {
                    user.name = decodedToken.name
                    user.avatar = decodedToken.picture
                    await user.save({ transaction: save })
                    return user
                } else
                    throw new AppError('Không thể đăng nhập', StatusCodes.BAD_REQUEST)
            })
    })
}