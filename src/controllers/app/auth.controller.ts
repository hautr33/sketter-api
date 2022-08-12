import crypto from 'crypto';
import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { Op } from 'sequelize';
import RESDocument from '../factory/RESDocument';
import { FORGOT_PASSWORD_URL } from '../../config/default';
import { User } from '../../models/user.model';
import { sendEmail } from '../../services/mail.service';
import AppError from '../../utils/appError';
import catchAsync from '../../utils/catchAsync';
import { Roles } from '../../utils/constant';
import { Role } from '../../models/role.model';
import { Session } from '../../models/session.model';
import { createSendToken } from '../../utils/jwt';
import { loginViaGoogle, signUpFirebase, updateUserPassword } from '../../services/firebaseAdmin.service';

export const signup = catchAsync(async (req, res, next) => {
    // Get parameters from body
    const { email, password, confirmPassword, role } = req.body;
    if (!password || password.length < 6 || password.length > 15)
        return next(new AppError('Mật khẩu phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (password !== confirmPassword)
        return next(new AppError('Nhập lại mật khẩu không khớp', StatusCodes.BAD_REQUEST));

    // Check user exist
    const count = await User.count({ where: { email: email } });
    if (count > 0)
        return next(new AppError('Email đã được sử dụng bởi tài khoản khác', StatusCodes.BAD_REQUEST));

    // Set parameters to user
    const user = new User();
    user.email = email;
    user.password = password;
    user.roleID = role;

    if (role == Roles.Traveler)
        user.name = email.split('@')[0];
    else if (role == Roles.Supplier) {
        const { name, owner, phone, address } = req.body;
        user.name = name;
        user.owner = owner;
        user.phone = phone;
        user.address = address;
    } else
        return next(new AppError('Có lỗi xảy ra khi đăng kí', StatusCodes.BAD_GATEWAY));

    // Add user to db
    await user.save()
        .catch((error) => {
            return next(new AppError(error.errors[0].message, StatusCodes.BAD_REQUEST));
        });

    // Add user to firebase
    const err = await signUpFirebase(email, password)
    if (err)
        return next(new AppError(err, StatusCodes.BAD_REQUEST));
    else {
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Đăng kí thành công");
        next();
    }
});

export const login = catchAsync(async (req, res, next) => {
    // Check auth type
    const authType = req.query.auth as string;
    if (authType && !(['Sketter', 'Google'].includes(authType)))
        return next(new AppError('Phương thức xác thực không hợp lệ', StatusCodes.BAD_REQUEST));

    // Login email password
    if (!authType || authType == 'Sketter') {
        const { email, password } = req.body;
        if (!(email || password))
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        // Check password
        const user = await User.findOne({ where: { email: email } });
        if (!user || !(await user.comparePassword(password as string)))
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        createSendToken(user.id, StatusCodes.OK, res, next);

        // Login to firebase
        // const error = await loginEmailPasswordFirebase(email, password)
        // if (error) {
        //     return next(new AppError(error, StatusCodes.BAD_REQUEST));
        // } else {
        //     const user = await User.findOne({ where: { email: email } });
        //     if (user)
        //         createSendToken(user.id, StatusCodes.OK, res, next);
        //     else
        //         return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND));
        // }
    }
    if (authType == 'Google') {
        const { token } = req.body;
        if (!token)
            return next(new AppError('Token không hợp lệ', StatusCodes.BAD_REQUEST));

        const result: any = await loginViaGoogle(token)
        if (typeof result === 'string')
            return next(new AppError(result, StatusCodes.BAD_REQUEST));
        else {
            createSendToken(result.id, StatusCodes.OK, res, next);
        }

        // firebaseAdmin.getAuth()
        //     .verifyIdToken(token)
        //     .then((decodedToken: any) => {
        //         res.resDocument = new RESDocument(StatusCodes.OK, 'success', decodedToken);
        //         next();

        //     })
        //     .catch((error: any) => {
        //         res.resDocument = new RESDocument(StatusCodes.OK, 'fail', error);
        //         next();

        //     });
    }
});

export const logout = catchAsync(async (req, res, next) => {
    const user = res.locals.user;
    await Session.destroy({ where: { userID: user.id, id: user.sessionID } });
    res.clearCookie('jwt');
    req.headers.authorization = undefined;
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'success', null);

    next();
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
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Đặt lại mật khẩu thành công");
        next();
    }
});


export const restrictTo = (...roles: Role['id'][]): RequestHandler => (_req, res, next) => {
    /* 
    We check if the attached User with the "role" is in the 
      whitelist of permissions
    */

    if (!roles.includes(res.locals.user?.roleID as Role['id'])) {
        return next(
            new AppError(
                'Bạn không có quyền để sử dụng tính năng này',
                StatusCodes.FORBIDDEN
            )
        );
    }
    next();
};