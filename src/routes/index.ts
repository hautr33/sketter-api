import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../utils/catchAsync";
import { Role } from "../models/role.model";

const router = express.Router();

router.get("/healthcheck", (_, res) => res.status(StatusCodes.OK).send({ "status": "success", "message": "Welcome to Sketter" }));

// just for test
router.get('/api/v1/initRole', catchAsync(async (_req, res, _next) => {
    enum role {
        'Admin' = 1,
        'Supplier Manager',
        'Supplier',
        'Traveler',
    }
    for (let i = 1; i <= 4; i++) {
        const [user, created] = await Role.findOrCreate({
            where: { id: i },
            defaults: {
                name: role[i]
            }
        });
        if (!created) {
            user.name = role[i];
            await user.save();
        }
    }
    res.status(StatusCodes.OK).send('Nhập Role thành công')
}));

router.use('/api/v1/auth', auth);
router.use('/api/v1/user', user);


export default router;