import crypto from 'crypto';
import { FORGOT_PASSWORD_URL } from '../../config/default';
import { StatusCodes } from "http-status-codes";
import { Roles, Status } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";
import sequelizeConnection from "../../db/sequelize.db";
import { Personalities } from "../../models/personalities.model";
import { Role } from "../../models/role.model";
import _ from "lodash"
import { UserPrivateFields } from "../../utils/private_field";
import { Op } from "sequelize";
import { sendEmail } from "../../services/mail.service";
import { updateUserPassword } from '../../services/firebase/firebase_admin.service';

export const getMe = catchAsync(async (_req, res, next) => {

    const user = await User.findByPk(
        res.locals.user.id,
        {
            attributes: { exclude: UserPrivateFields[res.locals.user.roleID ?? 0] },
            include: res.locals.user.roleID === Roles.Traveler ? [
                { model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] },
                { model: Role, as: 'role', attributes: { exclude: ['id'] } }
            ] : [
                { model: Role, as: 'role', attributes: { exclude: ['id'] } }
            ]
        }
    )
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { profile: user });
    next();
});

export const updateMe = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id)
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    const { name, phone, address, avatar, travelerPersonalities } = req.body;
    user.name = name
    user.phone = phone
    user.address = address
    user.avatar = avatar
    if (user.roleID == Roles.Traveler) {
        const { gender, dob } = req.body;
        user.gender = gender
        user.dob = dob
    } else if (user.roleID == Roles.Supplier) {
        const { owner } = req.body;
        user.owner = owner
    }
    await sequelizeConnection.transaction(async (update) => {
        await user.save({ transaction: update })
        await user.setTravelerPersonalities(travelerPersonalities, { transaction: update })
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Thông tin tài khoản đã được cập nhật', null);
    next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (currentPassword == newPassword) {
        return next(
            new AppError('Vui lòng nhập mật khẩu mới khác với mật khẩu hiện tại', StatusCodes.BAD_REQUEST)
        );
    }

    if (!newPassword || newPassword.length < 6 || newPassword.length > 15)
        return next(new AppError('Mật khẩu mới phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (newPassword !== confirmNewPassword) {
        return next(
            new AppError('Nhập lại mật khẩu mới không khớp', StatusCodes.BAD_REQUEST)
        );
    }
    const user = await User.findOne({ where: { id: res.locals.user.id } });
    if (!user || !(await user.comparePassword(currentPassword as string))) {
        return next(
            new AppError('Mật khẩu hiện tại không đúng', StatusCodes.BAD_REQUEST)
        );
    }
    user.password = newPassword;
    await user.save();
    getAuth()
        .updateUser(user.firebaseID, {
            password: newPassword,
        })
        .then(() => {
            res.resDocument = new RESDocument(StatusCodes.OK, 'Thay đổi mật khẩu thành công', null);
            next();
        })
        .catch((error) => {
            return next(new AppError(error.message, StatusCodes.BAD_GATEWAY));
        });
});

export const forgotPassword = catchAsync(async (req, res, next) => {

    const email = req.body.email;
    if (!email)
        return next(new AppError('Vui lòng nhập email', StatusCodes.NOT_FOUND));

    // TODO 1) get user based on Posted email
    const user = await User.findOne({ where: { email: email } });
    if (!user)
        return next(new AppError('Email không tồn tại', StatusCodes.NOT_FOUND));

    // TODO 2) Generate random reset token
    let resetToken = '';
    await user.createResetPasswordToken()
        .then((token) => {
            resetToken = token;
        })

    // Save back to user Database & ignore the validation
    await user.save();

    // TODO 3) Send it to user's email
    const resetURL = `${FORGOT_PASSWORD_URL}/${resetToken}`;

    const message = `Xin chào ${user.name},\nChúng tôi đã nhận được yêu cầu đặt lại mật khẩu Sketter của bạn.
        \nVui lòng bấm vào đường dẫn ở dưới để đặt lại mật khẩu:
        \n${resetURL}
        \nNếu bạn không yêu cầu đặt lại mật khẩu mới, hãy bỏ qua tin nhắn này.`;

    try {
        // Send Email
        await sendEmail({
            email: user.email,
            subject: 'Đặt lại mật khẩu Sketter (hết hạn sau 10 phút)',
            message
        });

        // return to User the response
        res.resDocument = new RESDocument(
            StatusCodes.OK,
            'Đường dẫn đặt lại mật khẩu đã được gửi sang email của bạn',
            null
        );

        next();
    } catch (err) {
        /* 
    If there is some error that we can't send to user's email, 
      we then delete the reset_token and its expiry time
    */
        user.passwordResetToken = null;
        user.passwordResetExpires = null;

        // Save back to Database the changes & ignore the validation
        await user.save();

        // Return the Error as a response
        return next(new AppError('Đã có lỗi xảy ra khi gửi mail cho bạn. Vui lòng thử lại sau', StatusCodes.INTERNAL_SERVER_ERROR));
    }
});

export const resetPassword = catchAsync(async (req, res, next) => {
    // TODO 1) Get user based on the token
    /*
  The Token provided on the URL is "unhashed", we need to hash
    it, then compare to the hashed version token inside the database
    validate. 
  */
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 6 || password.length > 15)
        return next(new AppError('Mật khẩu phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (password !== confirmPassword)
        return next(new AppError('Nhập lại mật khẩu không khớp', StatusCodes.BAD_REQUEST));

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // Finding user by token & check if the token has expired
    const user = await User.findOne({
        where:
        {
            passwordResetToken: hashedToken,
            passwordResetExpires: { [Op.gt]: Date.now() }
        }
    });

    // TODO 2) If token has not expired, and there is user, set the new password
    if (!user)
        return next(new AppError('Đường dẫn đặt lại mật khẩu đã hết hạn', StatusCodes.BAD_REQUEST));

    // Reset the password
    user.password = password;

    // Set token & its expiry to be undefined after using
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    // Save the user, before save it will be Hash&Salt again
    const error = await updateUserPassword(user)
    if (error)
        return next(new AppError(error, StatusCodes.BAD_REQUEST));
    else {
        res.resDocument = new RESDocument(StatusCodes.OK, 'Đặt lại mật khẩu thành công', null);
        next();
    }
});

export const sendVerifyEmail = catchAsync(async (_req, res, next) => {
    const user = await User.findOne({ where: { id: res.locals.user.id }, attributes: ['id', 'email', 'name', 'status'] })
    if (user?.status !== Status.unverified)
        return next(new AppError('Tài khoản đã được xác thực', StatusCodes.NOT_FOUND))

    await sequelizeConnection.transaction(async (verify) => {
        const code = await user.createVerifyCode();
        await user.save({ transaction: verify });
        const message = `Xin chào ${user.name},\nVui lòng nhập code dưới đây vào thiết bị của bạn để xác thực email của bạn:
        \n${code}`;

        // Send Email
        await sendEmail({
            email: user.email,
            subject: 'Sketter - Xác thực tài khoản (hết hạn sau 5 phút)',
            message
        });
    })

    res.resDocument = new RESDocument(
        StatusCodes.OK,
        `Mã xác thực đã được gửi đến ${user.email}`,
        null
    );
    next();
});

export const verifyEmail = catchAsync(async (req, res, next) => {
    const count = await User.count({
        where: {
            id: res.locals.user.id,
            verifyCode: req.body.code,
            verifyCodeExpires: { [Op.gt]: Date.now() }
        }
    })
    if (count !== 1)
        return next(new AppError('Mã xác thực của bạn đã hết hạn', StatusCodes.BAD_REQUEST))

    await User.update({ verifyCode: null, verifyCodeExpires: null, status: Status.verified }, { where: { id: res.locals.user.id } })

    res.resDocument = new RESDocument(
        StatusCodes.OK,
        `Xác thực email thành công`,
        null
    );
    next();
});