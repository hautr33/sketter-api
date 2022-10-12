import { getAuth } from "firebase-admin/auth";
import { Auth, Roles, Status } from "../../utils/constant";
import { User } from "../../models/user.model";

export const signUpFirebase = async (email: string, password: string): Promise<any> => {
    let err = undefined;
    await getAuth()
        .createUser({
            email: email,
            password: password
        })
        .then(async (userRecord: { uid: any; }) => {
            await User.update({ firebaseID: userRecord.uid }, { where: { email: email } });
        })
        .catch(async (error: { code: string | string[]; message: string; }) => {
            await User.destroy({ where: { email: email } });
            if (error.code.includes('exists'))
                err = 'Email đã được sử dụng bởi tài khoản khác'
            else
                err = error.message
        })
    return err;
}

export const loginViaGoogle = async (token: string): Promise<any> => {
    let result: any;
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
                await user.save()
                result = user
            } else if (user.status !== Status.deactivated) {
                user.name = decodedToken.name
                user.avatar = decodedToken.picture
                await user.save()
                result = user
            } else
                result = 'Tài khoản của bạn đã bị khoá'
        })
        .catch((error: any) => {
            result = error.message as string
        });

    return result;
}