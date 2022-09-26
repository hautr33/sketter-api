import { StatusCodes } from "http-status-codes";
import { Roles, Status } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import { getAuth } from "firebase-admin/auth";
import sequelizeConnection from "../../db/sequelize.db";
import { Personalities } from "../../models/personalities.model";
import { Role } from "../../models/role.model";
import _ from "lodash"
import { UserPrivateFields } from "../../utils/private_field";
import { Op } from "sequelize";

export const getMe = catchAsync(async (_req, res, next) => {
    let includes = []
    if (res.locals.user.roleID === Roles.Traveler)
        includes = [
            { model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] },
            { model: Role, as: 'role', attributes: { exclude: ['id'] } }
        ]
    else
        includes = [
            { model: Role, as: 'role', attributes: { exclude: ['id'] } }
        ]

    const user = await User.findByPk(
        res.locals.user.id,
        {
            attributes: { exclude: UserPrivateFields[res.locals.user.roleID ?? 0] },
            include: includes
        }
    )
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { profile: user });
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
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Thông tin tài khoản đã được cập nhật');
    next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (currentPassword == newPassword) {
        return next(
            new AppError('Vui lòng nhập mật khẩu mới khác với mật khẩu hiện tại', StatusCodes.BAD_REQUEST)
        );
    }

    if (!newPassword || newPassword.length < 6 || newPassword.length > 15)
        return next(new AppError('Mật khẩu mới phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (newPassword !== confirmNewPassword) {
        return next(
            new AppError('Nhập lại mật khẩu mới không khớp', StatusCodes.BAD_REQUEST)
        );
    }
    const user = await User.findOne({ where: { id: res.locals.user.id } });
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

export const getAllSupplier = catchAsync(async (_req, res, next) => {
    const suppliers = await User.findAll({ where: { roleID: Roles.Supplier }, attributes: { exclude: UserPrivateFields[Roles.Supplier] } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { suppliers });
    next();
});

export const createUser = catchAsync(async (req, res, next) => {
    const { name, email, roleName } = req.body;
    const role = await Role.findOne({ where: { name: { [Op.eq]: roleName, [Op.ne]: Roles.Admin } } });
    if (!role)
        return next(new AppError("Vai trò không hợp lệ", StatusCodes.BAD_REQUEST));
    const user = new User();
    user.name = name;
    user.email = email;
    user.roleID = role.id
    await user.save()
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Tạo tài khoản thành công');
    next();
});

export const updateUser = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const count = await User.count({ where: { id: id } });
    if (count != 1)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    const { name } = req.body;
    await User.update({ name: name }, { where: { id: id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Cập nhật tài khoản thành công');
    next();
});

export const deactivateUser = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const count = await User.count({ where: { id: id, status: Status.verified } });
    if (count != 1)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    await User.update({ status: Status.deactivated }, { where: { id: id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', 'Hủy kích hoạt tài khoản thành công');
    next();
});