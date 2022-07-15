import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { Role } from '../utils/constant';
import { User, travelerPrivateFields, supplierPrivateFields, defaultPrivateFields } from '../models/user.model';
import AppError from '../utils/appError';
import { verifyJwt } from '../utils/jwt.util';

export const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token
    let access_token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      access_token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      access_token = req.cookies.jwt;
    }

    if (!access_token) {
      return next(new AppError('You are not logged in', 401));
    }

    // Validate Access Token
    const decoded = verifyJwt<{ id: string, iat: number, exp: number }>(access_token);

    if (!decoded) {
      return next(new AppError(`Invalid token or user doesn't exist`, 401));
    }

    // Check if user has a valid session
    // const session = await redisClient.get(decoded.sub);

    // if (!session) {
    //   return next(new AppError(`User session has expired`, 401));
    // }

    // Check if user still exist
    const user = await User.findOne({ where: { id: decoded.id, iat: decoded.iat, exp: decoded.exp } });

    if (!user) {
      return next(new AppError(`User with that token no longer exist`, 401));
    }

    // This is really important (Helps us know if the user is logged in from other controllers)
    // You can do: (req.user or res.locals.user)

    if (user.roleID == Role.traveler) {
      const excludedUser = _.omit(user.toJSON(), travelerPrivateFields);
      res.locals.user = excludedUser;
    } else if (user.roleID == Role.supplier) {
      const excludedUser = _.omit(user.toJSON(), supplierPrivateFields);
      res.locals.user = excludedUser;
    } else {
      const excludedUser = _.omit(user.toJSON(), defaultPrivateFields);
      res.locals.user = excludedUser;
    }

    next();
  } catch (err: any) {
    next(err);
  }
};
