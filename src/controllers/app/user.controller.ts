import { StatusCodes } from "http-status-codes";
import { Roles } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";
import sequelizeConnection from "../../db/sequelize.db";

export const getMe = catchAsync(async (_req, res, next) => {
    const user = res.locals.user;
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
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
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Đã cập nhật thông tin của bạn');
    next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (currentPassword == newPassword) {
        return next(
            new AppError('Mật khẩu mới không được giống mật khẩu hiện tại', StatusCodes.BAD_REQUEST)
        );
    }

    if (!newPassword || newPassword.length < 6 || newPassword.length > 15)
        return next(new AppError('Mật khẩu mới phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (newPassword !== confirmNewPassword) {
        return next(
            new AppError('Nhập lại mật khẩu mới không khớp', StatusCodes.BAD_REQUEST)
        );
    }
    const user = await User.findOne({ where: { email: res.locals.user.email } });
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
            res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Thay đổi mật khẩu thành công');
            next();
        })
        .catch((error) => {
            return next(new AppError(error.message, StatusCodes.BAD_GATEWAY));
        });
});