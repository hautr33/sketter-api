import crypto from 'crypto';
import { NextFunction, RequestHandler, Response } from 'express';
// import firebaseAdmin from "firebase-admin/auth";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { Op } from 'sequelize';
import RESDocument from '../factory/RESDocument';
import { JWT_EXPIRES_IN, ENVIRONMENT, JWT_COOKIES_EXPIRES_IN } from '../../config/default';
import { User, UserRole } from '../../models/user.model';
import { sendEmail } from '../../services/mail.service';
import AppError from '../../utils/appError';
import catchAsync from '../../utils/catchAsync';
import { signJwt } from '../../utils/jwt';
import { Role } from '../../utils/constant';
import jwt from 'jsonwebtoken';
const firebaseAdmin = require("firebase-admin/auth");


/**
 * This function is for signing a token or generate a JWT
 *  token with provided JWT_SECRET, JWT_EXPIRES_IN as a
 *  .env variables.
 * @param {*} id - payload of the JWT, in this situation
 *  we include as an id of user
 */
const signToken = (id: string) =>
    signJwt(
        { id: id },
        {
            expiresIn: JWT_EXPIRES_IN,
        }
    )

/**
* This function Create & Send the JWT Token to the user end.
*  By using the function "signToken", it generates a JWT Token
*  with specific expires time. Furthermore, this method filters
*  some sensitive key fields such as "password" and also leverage
*  cookies when sending.
* @param {*} user - Instance of User Model from MongoDB
* @param {*} statusCode - HTTP StatusCode to be sent
* @param {*} res - Instance of Response in ExpressJS
*/
const createSendToken = (
    user: User,
    statusCode: number,
    res: Response,
    next: NextFunction
) => {
    // Generate the JWT Token with user id
    const token = signToken(user.id);

    // const excludedFields: string[] = ['password', 'passwordResetToken', 'passwordResetExpires', 'passwordUpdatedAt'];

    // const excludedObj = _.omit(user.toJSON(), excludedFields);

    // CookieOptions for sending
    const cookieOptions = {
        expires: new Date(
            // Now + Day * 24 Hours * 60 Minutes * 60 Seconds * 1000 milliseconds
            Date.now() +
            parseInt(JWT_COOKIES_EXPIRES_IN as string, 10) *
            24 *
            60 *
            60 *
            1000
        ),
        // Only work in HTTP or HTTPS Protocol
        httpOnly: true,
        secure: false
    };

    /* In HTTPS connection, Cookies will be encrypted and stay secure
      We only want this feature in production environment. Not in 
      development environment.
  */
    if (ENVIRONMENT === 'production') cookieOptions.secure = true;

    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded) {

        User.update({ iat: decoded.iat, exp: decoded.exp }, { where: { email: user.email } })
        // Send the JWT Token as cookie
        res.cookie('jwt', token, cookieOptions);

        res.resDocument = new RESDocument(statusCode, 'success', { token });

        next();
    } else {
        return next(new AppError('Fail to send token', StatusCodes.BAD_GATEWAY))
    }

};


class AuthController {
    static signup = catchAsync(async (req, res, next) => {
        // Get parameters from body
        const { email, password, confirmPassword, role } = req.body;

        if (!password) {
            return next(
                new AppError('Mật khẩu không được trống', StatusCodes.BAD_REQUEST)
            );
        }

        if (password.length < 6) {
            return next(
                new AppError('Mật khẩu phải có ít nhất 6 kí tự', StatusCodes.BAD_REQUEST)
            );
        }

        if (password !== confirmPassword) {
            return next(
                new AppError(
                    'Nhập lại mật khẩu không khớp',
                    StatusCodes.BAD_REQUEST
                )
            );
        }

        const userExsit = await User.findOne({ where: { email: email } });
        if (userExsit) {
            return next(new AppError('Email đã tồn tại', StatusCodes.BAD_REQUEST));
        }


        let user = new User();
        user.email = email;
        user.password = password;
        user.roleID = role;

        if (role == Role.traveler) {
            user.name = email.split('@')[0];
        } else if (role == Role.supplier) {
            const { name, owner, phone, address } = req.body;
            user.name = name;
            user.password = password;
            user.owner = owner;
            user.phone = phone;
            user.address = address;
        } else {
            return next(new AppError('Không thể đăng kí', StatusCodes.BAD_REQUEST));
        }
        await user.save()

        firebaseAdmin.getAuth()
            .createUser({
                email: email,
                password: password
            })
            .then(async (userRecord: { uid: any; }) => {
                await user.update({ firebaseID: userRecord.uid }, { where: { email: email } });
                res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Đăng kí thành công");
                next();
            })
            .catch((error: string) => {
                User.destroy({ where: { email: email } });
                return next(new AppError(error, StatusCodes.BAD_REQUEST));
            });

    });

    static login = catchAsync(async (req, res, next) => {
        const { email, password } = req.body;

        if (!(email || password)) {
            return next(
                new AppError(
                    'Email hoặc mật khẩu không đúng',
                    StatusCodes.BAD_REQUEST
                )
            );
        }

        const auth = getAuth();
        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const userFirebase = userCredential.user;
                const user = await User.findOne({ where: { email: email, firebaseID: userFirebase.uid } });
                if (!user) {
                    return next(
                        new AppError('Email hoặc mật khẩu không đúng', StatusCodes.UNAUTHORIZED)
                    );
                }
                createSendToken(user, StatusCodes.OK, res, next);
            })
            .catch((error) => {
                const errorMessage = error.message;
                if (errorMessage.includes('wrong-password')) {
                    return next(
                        new AppError('Email hoặc mật khẩu không đúng', StatusCodes.UNAUTHORIZED)
                    );
                } else {
                    return next(new AppError(errorMessage, StatusCodes.BAD_REQUEST));
                }
            });
    });


    static loginGoogle = catchAsync(async (_req, res, next) => {
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Update successfully');
        next();
    });

    static logout = catchAsync(async (req, res, next) => {
        await User.update({ iat: null, exp: null }, { where: { email: res.locals.user.email } });
        res.clearCookie('jwt');
        req.headers.authorization = undefined;
        res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'success', null);

        next();
    });

    static forgotPassword = catchAsync(async (req, res, next) => {

        // TODO 1) get user based on Posted email
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user) {
            return next(
                new AppError(
                    'Email không tồn tại',
                    StatusCodes.NOT_FOUND
                )
            );
        }

        // TODO 2) Generate random reset token
        let resetToken = '';
        await user.createResetPasswordToken()
            .then((token) => {
                resetToken = token;
            })

        // Save back to user Database & ignore the validation
        await user.save();

        // TODO 3) Send it to user's email
        const resetURL = `${req.protocol}://${req.get(
            'host'
        )}/api/v1/user/reset_password/${resetToken}`;

        const message = `Xin chào ${user.name},\nChúng tôi đã nhận được yêu cầu đặt lại mật khẩu Sketter của bạn.
        \nVui lòng bấm vào đường dẫn ở dưới để đặt lại mật khẩu:
        \n ${resetURL}. 
        \nBạn đã không yêu cầu thay đổi này?\nNếu bạn không yêu cầu đặt lại mật khẩu mới, hãy bỏ qua tin nhắn này.`;

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
            return next(
                new AppError(
                    'Đã có lỗi xảy ra khi gửi mail cho bạn. Vui lòng thử lại sau',
                    StatusCodes.INTERNAL_SERVER_ERROR
                )
            );
        }
    });

    static resetPassword = catchAsync(async (req, res, next) => {
        // TODO 1) Get user based on the token
        /*
      The Token provided on the URL is "unhashed", we need to hash
        it, then compare to the hashed version token inside the database
        validate. 
      */
        const { password, confirmPassword } = req.body;
        if (!password) {
            return next(
                new AppError('Mật khẩu không được trống', StatusCodes.BAD_REQUEST)
            );
        }

        if (password.length < 6) {
            return next(
                new AppError('Mật khẩu phải có ít nhất 6 kí tự', StatusCodes.BAD_REQUEST)
            );
        }

        if (password !== confirmPassword) {
            return next(
                new AppError(
                    'Nhập lại mật khẩu không khớp',
                    StatusCodes.BAD_REQUEST
                )
            );
        }
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Finding user by token & check if the token has expired
        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { [Op.gt]: Date.now() }
            }
        });

        // TODO 2) If token has not expired, and there is user, set the new password
        if (!user) {
            return next(
                new AppError(
                    'Đường dẫn đặt lại mật khẩu đã hết hạn',
                    StatusCodes.BAD_REQUEST
                )
            );
        }

        // Reset the password
        user.password = password;

        // Set token & its expiry to be undefined after using
        user.passwordResetToken = null;
        user.passwordResetExpires = null;

        // Save the user, before save it will be Hash&Salt again

        firebaseAdmin.getAuth()
            .updateUser(user.firebaseID, {
                password: password,
            })
            .then(async () => {
                await user.save();
                createSendToken(user, StatusCodes.OK, res, next);
            })
            .catch((error: { message: string; }) => {
                return next(new AppError(error.message, StatusCodes.BAD_GATEWAY));
            });
        // TODO 3) Update changedPasswordAt property for the user
        // Already did in userModel, 'pre' save

        // TODO 4) Log the user in, send JWT
    });


    static restrictTo = (...roles: UserRole[]): RequestHandler => (
        _req,
        res,
        next
    ) => {
        /* 
        We check if the attached User with the "role" is in the 
          whitelist of permissions
        */

        if (!roles.includes(res.locals.user?.roleID as UserRole)) {
            return next(
                new AppError(
                    'Bạn không có quyền để sử dụng tính năng này',
                    StatusCodes.FORBIDDEN
                )
            );
        }
        next();
    };
}
export default AuthController;
