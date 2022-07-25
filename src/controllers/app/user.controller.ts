import { StatusCodes } from "http-status-codes";
import { Role } from "../../utils/constant";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import AppError from "../../utils/appError";
import isImageURL from "image-url-validator";
import { User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";
import { UserPrivateFields } from "../../utils/privateField";

class UserController {
    static getMe = catchAsync(async (_req, res, next) => {
        const user = res.locals.user;
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
        next();
    });

    static updateMe = catchAsync(async (req, res, next) => {
        let user = await User.findOne({ where: { email: res.locals.user.email }, attributes: { exclude: UserPrivateFields.default } });

        if (!user) {
            return next(new AppError('Không tìm thấy tài khoản của bạn', StatusCodes.NOT_FOUND))
        }
        const { name, image, phone, address } = req.body;
        user.name = name;
        user.phone = phone;
        user.address = address;

        //--------------
        if (image) {
            isImageURL(image)
                .then(isImage => {
                    if (!isImage) {
                        return next(
                            new AppError('Invalid image', StatusCodes.UNSUPPORTED_MEDIA_TYPE)
                        );
                    }
                });
            user.image = image;
        }
        //-----------------

        if (user.roleID == Role.traveler) {
            const { gender, dob } = req.body;
            user.gender = gender;
            user.dob = dob;

        } else if (user.roleID == Role.supplier) {
            const { owner } = req.body;
            user.owner = owner;
        }

        await user.save();
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Đã cập nhật thông tin của bạn');
        next();
    });

    static updatePassword = catchAsync(async (req, res, next) => {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword) {
            return next(
                new AppError('Mật khẩu hiện tại không được trống', StatusCodes.BAD_REQUEST)
            );
        }

        if (currentPassword == newPassword) {
            return next(
                new AppError('Mật khẩu mới không được giống mật khẩu hiện tại', StatusCodes.BAD_REQUEST)
            );
        }
        if (!newPassword) {
            return next(
                new AppError('Mật khẩu mới không được trống', StatusCodes.BAD_REQUEST)
            );
        }

        if (newPassword.length < 6) {
            return next(
                new AppError('Mật khẩu mới phải có ít nhất 6 kí tự', StatusCodes.BAD_REQUEST)
            );
        }

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
}
export default UserController;
