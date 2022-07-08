// import crypto from 'crypto';
import { NextFunction, RequestHandler, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { JWT_EXPIRES_IN, ENVIRONMENT, JWT_COOKIES_EXPIRES_IN } from '../../config/default';
import { User, UserRole } from '../../models/user.model';
// import { sendEmail } from '../../services/mail.service';
import AppError from '../../utils/appError';
import catchAsync from '../../utils/catchAsync';
import RESDocument from '../factory/RESDocument';
import { signJwt } from '../../utils/jwt.util';

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

    // Send the JWT Token as cookie
    res.cookie('jwt', token, cookieOptions);

    res.resDocument = new RESDocument(statusCode, 'success', { token });

    next();
};


class AuthController {
    static signup = catchAsync(async (req, res, next) => {
        // Get parameters from body
        const { email, password, confirmPassword, role } = req.body;

        if (password === '' || password === null) {
            return next(
                new AppError('Please enter Password', StatusCodes.BAD_REQUEST)
            );
        }
        if (password !== confirmPassword) {
            return next(
                new AppError(
                    'Incorrect Confirm Password',
                    StatusCodes.BAD_REQUEST
                )
            );
        }

        let user = new User();
        user.email = email;
        user.name = email.split('@')[0];
        user.password = password;
        user.roleID = role;

        const userExsit = await User.findOne({ where: { email: email } });
        if (userExsit) {
            return next(new AppError('Email is exsit', StatusCodes.BAD_REQUEST));
        }

        await user.save()
            .then(() => {
                res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Signup success");
                next();
            });
    });

    static signupSupplier = catchAsync(async (req, res, next) => {
        // Get parameters from body
        const { email, password, confirmPassword, name, owner, phone, address, taxCode, role } = req.body;

        if (!name) {
            return next(
                new AppError('Please enter Supplier\'s name', StatusCodes.BAD_REQUEST)
            );
        }
        if (!owner) {
            return next(
                new AppError('Please enter Supplier\'s owner', StatusCodes.BAD_REQUEST)
            );
        }
        if (!phone) {
            return next(
                new AppError('Please enter Supplier\'s phone', StatusCodes.BAD_REQUEST)
            );
        }
        if (!address) {
            return next(
                new AppError('Please enter Supplier\'s address', StatusCodes.BAD_REQUEST)
            );
        }
        if (!taxCode) {
            return next(
                new AppError('Please enter Supplier\'s tax code', StatusCodes.BAD_REQUEST)
            );
        }
        if (!password) {
            return next(
                new AppError('Please enter Password', StatusCodes.BAD_REQUEST)
            );
        }
        if (password !== confirmPassword) {
            return next(
                new AppError(
                    'Incorrect Confirm Password', StatusCodes.BAD_REQUEST
                )
            );
        }

        let user = new User();
        user.email = email;
        user.name = name;
        user.password = password;
        user.owner = owner;
        user.phone = phone;
        user.address = address;
        user.taxCode = taxCode;
        user.roleID = role;

        const userExsit = await User.findOne({ where: { email: email } });
        if (userExsit) {
            return next(new AppError('Email is exsit', StatusCodes.BAD_REQUEST));
        }

        await user.save()
            .then(() => {
                res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Signup success");
                next();
            });
    });

    static login = catchAsync(async (req, res, next) => {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!(email || password)) {
            return next(
                new AppError(
                    'Cannot find account or password!',
                    StatusCodes.BAD_REQUEST
                )
            );
        }

        // 2) Check if user exists && password is correct

        /* Because we exclude the password field by default, now we manually added 
        in order to double-check with the provided password. We should use .select('+field').
        To seperate and double-check role, we have to check role of user before 
        allow they login into resource. 	
        */
        const user = await User.findOne({ where: { email: email } });

        // Leverage the Mongo Methods has been written in User model. Check the correctness
        if (!user || !(await user.checkCorrectness(password as string))) {
            return next(
                new AppError('Wrong Email or password!', StatusCodes.UNAUTHORIZED)
            );
        }

        createSendToken(user, StatusCodes.OK, res, next);
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
                    'You do not have permission to use this feature.',
                    StatusCodes.FORBIDDEN
                )
            );
        }
        next();
    };
}
export default AuthController;
