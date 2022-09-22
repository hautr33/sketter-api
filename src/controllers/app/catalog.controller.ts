import catch_async from "../../utils/catch_async";
import { Catalog } from "../../models/catalog.model";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";

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