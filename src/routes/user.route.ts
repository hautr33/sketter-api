import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { getAllSupplier, getMe, updateMe, updatePassword } from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";
import { forgotPassword, resetPassword, restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";

const router = Router();

router.post('/forgot_password', standardPipeline(forgotPassword));

router.patch('/reset_password/:token', standardPipeline(resetPassword));

router.use(deserializeUser, requireUser);
router
    .route('/me')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles["Supplier Manager"], Roles.Admin), getMe))
    .patch(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier), updateMe))

router.patch('/update_password', standardPipeline(updatePassword));

router.get('/supplier', standardPipeline(restrictTo(Roles["Supplier Manager"]), getAllSupplier));

export default router;