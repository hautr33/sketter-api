import { StatusCodes } from "http-status-codes";
import { listStatusUser, Roles, Status } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import { Role } from "../../models/role.model";
import _ from "lodash"
import { UserPrivateFields } from "../../utils/private_field";
import { Op } from "sequelize";
import { signUpFirebase } from "../../services/firebase/firebase_admin.service";
import { PAGE_LIMIT } from "../../config/default";

export const createUser = catchAsync(async (req, res, next) => {
    const { name, email, password, confirmPassword, roleName } = req.body;
    const role = await Role.findOne({ where: { description: { [Op.eq]: roleName }, id: { [Op.ne]: Roles.Admin } } });
    if (!role)
        return next(new AppError("Vai trò không hợp lệ", StatusCodes.BAD_REQUEST));

    if (!password || password.length < 6 || password.length > 16)
        return next(new AppError('Mật khẩu phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST));

    if (password !== confirmPassword)
        return next(new AppError('Nhập lại mật khẩu không khớp', StatusCodes.BAD_REQUEST));

    const user = new User();
    user.name = name;
    user.email = email;
    user.password = password;
    user.roleID = role.id
    await user.save()
        .then(async () => {
            // Add user to firebase
            const err = await signUpFirebase(email, password)
            if (err)
                return next(new AppError(err, StatusCodes.BAD_REQUEST));
            else {
                res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo tài khoản thành công', null);
                next();
            }
        })
        .catch((error) => {
            return next(new AppError(error.errors[0].message, StatusCodes.BAD_REQUEST));
        });
});

export const updateUser = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const count = await User.count({ where: { id: id } });
    if (count != 1)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));

    const { name, avatar, status } = req.body;

    if (status && !listStatusUser.includes(status))
        return next(new AppError("Trạng thái không hợp lệ", StatusCodes.BAD_REQUEST));

    await User.update({ name: name, avatar: avatar, status: status }, { where: { id: id } })
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

export const getAllUser = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const status = req.query.status as string;

    if (status && !listStatusUser.includes(status))
        return next(new AppError("Trạng thái không hợp lệ", StatusCodes.BAD_REQUEST));

    const users = await User.findAll(
        {
            where: status ? { status: status, id: { [Op.ne]: res.locals.user.id } } : { id: { [Op.ne]: res.locals.user.id } },
            attributes: { exclude: UserPrivateFields[0] },
            include: [{ model: Role, as: 'role', attributes: { exclude: ['id'] } }],
            order: [['name', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )
    const count = await User.count({ where: status ? { status: status, id: { [Op.ne]: res.locals.user.id } } : { id: { [Op.ne]: res.locals.user.id } } })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { users }
    )
    if (count != 0) {
        const maxPage = Math.ceil(count / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next();
});

export const getOneUser = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const count = await User.count({ where: { id: id } });
    if (count != 1)
        return next(new AppError("Không tìm thấy thông tin tài khoản", StatusCodes.BAD_REQUEST));
    const user = await User.findOne(
        {
            where: { id: id },
            attributes: { exclude: UserPrivateFields[0] },
            include: [{ model: Role, as: 'role', attributes: { exclude: ['id'] } }]
        }
    )
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
    next();
});