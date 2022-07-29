import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";

export const create = catchAsync(async (_req, res, next) => {
    const user = res.locals.user;
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
    next();
});