import { StatusCodes } from "http-status-codes";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";

export const create = catchAsync(async (_req, res, next) => {

    const destination = await Destination.create({ name: 'Manwah' });
    for (let i = 1; i < 4; i++) {
        const catalog = await Catalog.findByPk(i);
        if (catalog)
            await destination.addCatalog(catalog);
    }

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', destination);
    next();
});