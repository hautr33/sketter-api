import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { Roles } from '../utils/constant';
import { TravelPersonalityType } from '../models/personality_type.model';
import { Session } from '../models/session.model';
import { User } from '../models/user.model';
import AppError from '../utils/app_error';
import { verifyJwt } from '../utils/jwt';
import { UserPrivateFields } from '../utils/private_field';
// import { getDownloadURL, getStorage, ref } from "firebase/storage";
// import { USER_DEFAULT_IMG_URL } from '../config/default';

export const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token
    let access_token;
    if (req.headers.authorization
      && req.headers.authorization.startsWith('Bearer')
    ) {
      access_token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      access_token = req.cookies.jwt;
    }

    if (!access_token)
      return next(new AppError('Vui lòng đăng nhập để sử dụng tính năng này', 401));

    // Validate Access Token
    const decoded = verifyJwt<{ id: string, iat: number, exp: number }>(access_token);
    if (!decoded)
      return next(new AppError(`Token không hợp lệ hoặc tài khoản không tồn tại`, 401));

    const session = await Session.findOne({ where: { userID: decoded.id, iat: decoded.iat, exp: decoded.exp } });
    if (!session)
      return next(new AppError('Phiên đăng nhập đã hết hạn', StatusCodes.UNAUTHORIZED))

    let user = await User.findOne({
      where: { id: decoded.id }
    });
    if (!user)
      return next(new AppError('Không tìm thấy tài khoản của bạn', StatusCodes.NOT_FOUND));

    // This is really important (Helps us know if the user is logged in from other controllers)
    // You can do: (req.user or res.locals.user)

    if (user.roleID === Roles.Traveler)
      user = await User.findOne({
        where: { id: decoded.id }
        , include: [
          { model: TravelPersonalityType, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] },
        ]
      });
    const excludedUser = _.omit(user?.toJSON(), UserPrivateFields[user?.roleID ?? 0]);
    res.locals.user = excludedUser;
    res.locals.user.sessionID = session.id;
    if (res.locals.user.roleID === Roles.Traveler)
      res.locals.user.travelerPersonalities = _.map(res.locals.user.travelerPersonalities, function (personality) { return personality.name; })
    next();
  } catch (err: any) {
    next(err);
  }
};
