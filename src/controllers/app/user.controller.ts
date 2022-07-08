import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import RESDocument from "../factory/RESDocument";

class UserController {
    static getMe = catchAsync(async (_, res, next) => {
        const user = res.locals.user;
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', user);
        next();
    });
}
export default UserController;
