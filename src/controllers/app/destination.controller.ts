import { StatusCodes } from "http-status-codes";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";

export const create = catchAsync(async (_req, res, next) => {
    const catalog = await Catalog.findByPk(1);
    const destination = await Destination.create({ name: 'Manwah' });
    if (catalog)
        await destination.addCatalog(catalog);
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', destination);
    next();
});