import { StatusCodes } from "http-status-codes";
import { Roles } from "../../utils/constant";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import AppError from "../../utils/appError";
import { User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";
import { UserPrivateFields } from "../../utils/privateField";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { UploadedFile } from "express-fileupload";
import { USER_IMG_URL } from "../../config/default";

export const getMe = catchAsync(async (_req, res, next) => {
    const user = res.locals.user;
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
    next();
});

export const updateMe = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ where: { email: res.locals.user.email }, attributes: { exclude: UserPrivateFields.default } });

    if (!user)
        return next(new AppError('Không tìm thấy tài khoản của bạn', StatusCodes.NOT_FOUND))

    const { name, phone, address } = req.body;

    if (user.roleID == Roles.Traveler) {
        const { gender, dob } = req.body;
        await User.update({ name: name, phone: phone, address: address, gender: gender, dob: dob }, { where: { id: user.id } })
    } else if (user.roleID == Roles.Supplier) {
        const { owner } = req.body;
        await User.update({ name: name, phone: phone, address: address, owner: owner }, { where: { id: user.id } })
    }
    if (req.files && req.files.avatar) {
        const imgNum = (req.files.avatar as UploadedFile[]).length ?? 1;
        if ((req.files.avatar as UploadedFile[] || req.files.avatar as UploadedFile) && imgNum == 1) {
            const avatar = req.files.avatar as UploadedFile;
            if (avatar.mimetype.includes('image')) {
                const storage = getStorage();
                const image = `${USER_IMG_URL}/${user?.id}.${avatar.name.split('.')[1]}`;
                const storageRef = ref(storage, image);

                const bytes = new Uint8Array(avatar.data);
                await uploadBytes(storageRef, bytes).then(async (snapshot) => {
                    const image = snapshot.metadata.fullPath;
                    await User.update({ image: image }, {
                        where: {
                            id: user?.id
                        }
                    });
                });
            } else {
                return next(new AppError('Ảnh không hợp lệ', StatusCodes.BAD_REQUEST))
            }
        } else {
            return next(new AppError('Có lỗi xảy ra khi upload ảnh', StatusCodes.BAD_REQUEST))
        }
    }
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Đã cập nhật thông tin của bạn');
    next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
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