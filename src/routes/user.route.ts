import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { getMe, updateAvatar, updateMe, updatePassword } from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";
import { forgotPassword, resetPassword, restrictTo } from "../controllers/app/auth.controller";
import { UserRole } from "../utils/constant";

const router = Router();

router.post('/forgot_password', standardPipeline(forgotPassword));

router.patch('/reset_password/:token', standardPipeline(resetPassword));

router.use(deserializeUser, requireUser);
router
    .route('/me')
    .get(standardPipeline(restrictTo(UserRole.traveler, UserRole.supplier), getMe))
    .patch(standardPipeline(restrictTo(UserRole.traveler, UserRole.supplier), updateMe))

router.patch('/me/avatar', standardPipeline(updateAvatar));
router.patch('/update_password', standardPipeline(updatePassword));


export default router;