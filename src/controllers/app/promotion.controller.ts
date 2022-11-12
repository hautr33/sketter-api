import catch_async from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import { Promotion } from "../../models/promotion.model";

/**
 * This controller is getAllCatalog that get all destination catalogs
 *
 */
export const createPromotion = catch_async(async (req, res, next) => {
    const destinationID = req.params.id
    const supplierID = res.locals.user.id
    const { name, description, quantity, salePrice, oldPrice, fromDate, toDate, promotionType } = req.body
    const promotion = await Promotion.create(
        {
            destinationID: destinationID, name: name, description: description, quantity: quantity, salePrice: salePrice, oldPrice: oldPrice,
            fromDate: fromDate, toDate: toDate, promotionType: promotionType, supplierID: supplierID
        }
    )
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { promotion });
    next()
})
