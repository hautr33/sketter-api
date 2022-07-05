// import crypto from 'crypto';
import { NextFunction, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_COOKIES_EXPIRES_IN, ENVIRONMENT } from '../../config/default';
import { User } from '../../models/user.model';
// import { sendEmail } from '../../services/mail.service';
import AppError from '../../utils/app_error.util';
import catchAsync from '../../utils/catch_async.util';
import RESDocument from '../factory/RESDocument';
import { ROLE } from '../../utils/constant.util'

/**
 * This function is for signing a token or generate a JWT
 *  token with provided JWT_SECRET, JWT_EXPIRES_IN as a
 *  .env variables.
 * @param {*} id - payload of the JWT, in this situation
 *  we include as an id of user
 */
const signToken = (id: string) =>
    jwt.sign({ id }, JWT_SECRET as string, {
        expiresIn: JWT_EXPIRES_IN
    });

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

    const excludedFields: string[] = ['password', 'passwordResetToken', 'passwordResetExpires', 'passwordUpdatedAt'];

    const excludedObj = _.omit(user.toJSON(), excludedFields);

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

    res.resDocument = new RESDocument(statusCode, 'success', excludedObj);

    next();
};


class AuthController {
    static signup = catchAsync(async (req, res, next) => {
        // Get parameters from body
        const { email, password, confirmPassword, roleID } = req.body;

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

        // Get Role if Supplier, default Traveler
        if (roleID == ROLE.SUPPLIER) {
            user.roleID = roleID;
        }

        const userExsit = await User.findOne({ where: { email: email } });
        if (userExsit) {
            return next(new AppError('Email is exsit', StatusCodes.BAD_REQUEST));
        }

        const newUser = await user.save();

        // Send result back to Client
        createSendToken(newUser, StatusCodes.CREATED, res, next);
    });
    static login = catchAsync(async (req, res, next) => {
        const { email, password, role } = req.body;

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
        const user = await User.findOne({ where: { email: email, roleID: role } });

        // Leverage the Mongo Methods has been written in User model. Check the correctness
        if (!user || !(await user.checkCorrectness(password as string))) {
            return next(
                new AppError('Wrong Email or password!', StatusCodes.UNAUTHORIZED)
            );
        }

        // 3) If everything ok, send token to client
        createSendToken(user, StatusCodes.OK, res, next);
    });

    // static login = async (req: Request, res: Response, next: NextFunction) => {
    //     // Get parameters from body
    //     const { email, password } = req.body;
    //     User.findOne({ where: { email: email } })
    //         .then((user: User) => {
    //             if (!user) {
    //                 return res.status(StatusCodes.NOT_FOUND).send("Invalid email")
    //             }

    //             if (!user.isActive) {
    //                 return res.send("Unverified account");
    //             }

    //             user.comparePassword(password, (err: Error, isMatch: boolean) => {
    //                 if (err) { return res.send(err); }
    //                 if (isMatch) {
    //                     return res.send("ahii")
    //                 }
    //                 res.status(StatusCodes.CONFLICT).send("qqqqqqqq")
    //             })
    //         })
    //         .catch((e) => {
    //             res.status(StatusCodes.BAD_REQUEST).send(e)
    //         })
    // };

    // static changePassword = async (req: Request, res: Response) => {

    // };
}
export default AuthController;
