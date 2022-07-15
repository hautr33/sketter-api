import { StatusCodes } from "http-status-codes";
import { Role } from "../../utils/constant";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import AppError from "../../utils/appError";
import isImageURL from "image-url-validator";
import { defaultPrivateFields, User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";

class UserController {
    static getMe = catchAsync(async (_req, res, next) => {
        const user = res.locals.user;
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
        next();
    });

    static updateMe = catchAsync(async (req, res, next) => {
        let user = await User.findOne({ where: { email: res.locals.user.email }, attributes: { exclude: defaultPrivateFields } });

        if (!user) {
            return next(new AppError('User not found', StatusCodes.NOT_FOUND))
        }
        const { name, image, phone, address } = req.body;
        if (name) {
            user.name = name;
        }
        if (phone) {
            user.phone = phone;
        }
        if (address) {
            user.address = address;
        }
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

        if (user.roleID == Role.traveler) {
            const { gender, dob } = req.body;
            if (gender) {
                user.gender = gender;
            }
            if (dob) {
                user.dob = dob;
            }

        } else if (user.roleID == Role.supplier) {
            const { owner } = req.body;
            if (owner) {
                user.owner = owner;
            }
        }

        await user.save();
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Update successfully');
        next();
    });

    static updatePassword = catchAsync(async (req, res, next) => {
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (currentPassword == newPassword) {
            return next(
                new AppError('New Password must be different Current Password', StatusCodes.BAD_REQUEST)
            );
        }
        if (!newPassword) {
            return next(
                new AppError('Password can not be blank', StatusCodes.BAD_REQUEST)
            );
        }

        if (newPassword.length < 6) {
            return next(
                new AppError('New Password should be at least 6 characters', StatusCodes.BAD_REQUEST)
            );
        }

        if (newPassword !== confirmNewPassword) {
            return next(
                new AppError('Incorrect Confirm New Password', StatusCodes.BAD_REQUEST)
            );
        }
        const user = await User.findOne({ where: { email: res.locals.user.email } });
        if (!user || !(await user.comparePassword(currentPassword as string))) {
            return next(
                new AppError('Incorrect Current Password!', StatusCodes.BAD_REQUEST)
            );
        }
        user.password = newPassword;
        await user.save();
        getAuth()
            .updateUser(user.firebaseID, {
                password: newPassword,
            })
            .then(() => {
                res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Update successfully');
                next();
            })
            .catch((error) => {
                return next(new AppError(error.message, StatusCodes.BAD_GATEWAY));
            });
    });
}
export default UserController;
