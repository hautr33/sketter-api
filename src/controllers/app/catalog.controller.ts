import { StatusCodes } from "http-status-codes";
import { Catalog } from "../../models/catalog.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";

export const getAll = catchAsync(async (_req, res, next) => {
    const catalogs = await Catalog.findAll();
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', catalogs);
    next();
})