import catch_async from "../../utils/catch_async";
import { Catalog } from "../../models/catalog.model";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";

export const getAllCatalog = catch_async(async (_req, res, next) => {
    const catalogs = await Catalog.findAll(
        {
            where: { parent: null },
            attributes: { exclude: ['parent'] },
            include: [
                {
                    model: Catalog, as: 'sub', attributes: { exclude: ['parent'] }
                }
            ]
        }
    )
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { catalogs });

    next()
})

export const createCatalog = catch_async(async (req, res, next) => {
    const { name, parent } = req.body;
    if (!name)
        return next(new AppError('Vui lòng nhập loại địa điểm phụ', StatusCodes.BAD_REQUEST));

    const countName = await Catalog.count({ where: { name: name } });
    if (countName === 1)
        return next(new AppError(`Loại địa điểm "${name}" đã tồn tại`, StatusCodes.BAD_REQUEST));

    const count = await Catalog.count({ where: { name: parent, parent: null } });
    if (count !== 1)
        return next(new AppError('Loại địa điểm chính không hợp lệ', StatusCodes.BAD_REQUEST));

    await Catalog.create({ name: name, parent: parent })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', `Đã thêm loại địa điểm "${name}" vào "${parent}"`);

    next()
})