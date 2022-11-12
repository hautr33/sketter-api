import { StatusCodes } from "http-status-codes";
import { listStatusUser, Roles, Status } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import { Role } from "../../models/role.model";
import _ from "lodash"
import { Op } from "sequelize";
import { checkPassword, getAllUserService, getUserService, updateUserService } from "../../services/user.service";
import { signUpFirebase } from "../../services/firebase/firebase_admin.service";

export const createUser = catchAsync(async (req, res, next) => {
    const { name, email, password, confirmPassword, roleName } = req.body;

    const role = await Role.findOne({ where: { description: { [Op.eq]: roleName }, id: { [Op.ne]: Roles.Admin } } });
    if (!role)
        return next(new AppError("Vai trò không hợp lệ", StatusCodes.BAD_REQUEST));

    checkPassword(password, confirmPassword)

    const user = new User();
    user.name = name;
    user.email = email.toLowerCase();
    user.password = password;
    user.roleID = role.id
    if (role.id == Roles.Supplier) {
        const { owner, phone, address } = req.body;
        user.owner = owner;
        user.phone = phone;
        user.address = address;
    }
    user.isCheck = true
    await signUpFirebase(user)
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo tài khoản thành công', null);
    next();
});

export const getAllUser = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const status = req.query.status as string;

    if (status && !listStatusUser.includes(status))
        return next(new AppError("Trạng thái không hợp lệ", StatusCodes.BAD_REQUEST));

    const users = await getAllUserService(page, status)
    res.resDocument = users;
    next();
});

export const getOneUser = catchAsync(async (req, res, next) => {
    const user = await getUserService(req.params.id)
    if (!user)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
    next();
});

export const updateUser = catchAsync(async (req, res, next) => {
    if (!listStatusUser.includes(req.body.status))
        return next(new AppError("Trạng thái không hợp lệ", StatusCodes.BAD_REQUEST));

    const user = await updateUserService(req.params.id, req.body, true)
    if (!user)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật tài khoản thành công', null);
    next();
});

export const deactivateUser = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const count = await User.count({ where: { id: id, status: { [Op.ne]: Status.deactivated } } });
    if (count != 1)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    await User.update({ status: Status.deactivated }, { where: { id: id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Huỷ kích hoạt tài khoản thành công', null);
    next();
});