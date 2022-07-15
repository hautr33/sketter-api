import { StatusCodes } from "http-status-codes";
import { Role } from "../../utils/constant";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";
import AppError from "../../utils/appError";
import isImageURL from "image-url-validator";
import { defaultPrivateFields, User } from "../../models/user.model";

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
}
export default UserController;
