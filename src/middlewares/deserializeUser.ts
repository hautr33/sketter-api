import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { UserRole } from '../utils/constant';
import { User } from '../models/user.model';
import AppError from '../utils/appError';
import { verifyJwt } from '../utils/jwt';
import { UserPrivateFields } from '../utils/privateField';
import { getDownloadURL, getStorage, ref } from "firebase/storage";

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
      return next(new AppError('Vui lòng đăng nhập để sử dụng tính năng này', 401));
    }

    // Validate Access Token
    const decoded = verifyJwt<{ id: string, iat: number, exp: number }>(access_token);

    if (!decoded) {
      return next(new AppError(`Token không hợp lệ hoặc tài khoản không tồn tại`, 401));
    }

    // Check if user has a valid session
    // const session = await redisClient.get(decoded.sub);

    // if (!session) {
    //   return next(new AppError(`User session has expired`, 401));
    // }

    // Check if user still exist
    const user = await User.findOne({ where: { id: decoded.id, iat: decoded.iat, exp: decoded.exp } });

    if (!user) {
      return next(new AppError(`Phiên đăng nhập đã hết hạn`, 401));
    }

    // This is really important (Helps us know if the user is logged in from other controllers)
    // You can do: (req.user or res.locals.user)

    if (user.roleID == UserRole.traveler) {
      const excludedUser = _.omit(user.toJSON(), UserPrivateFields.traveler);
      res.locals.user = excludedUser;
    } else if (user.roleID == UserRole.supplier) {
      const excludedUser = _.omit(user.toJSON(), UserPrivateFields.supplier);
      res.locals.user = excludedUser;
    } else {
      const excludedUser = _.omit(user.toJSON(), UserPrivateFields.default);
      res.locals.user = excludedUser;
    }
    const storage = getStorage();
    await getDownloadURL(ref(storage, user.image))
      .then((url) => {
        res.locals.user.image = url;
      })
    next();
  } catch (err: any) {
    next(err);
  }
};
