import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import UserController from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";
import AuthController from "../controllers/app/auth.controller";
import { UserRole } from "../utils/constant";

const router = Router();


router.post('/forgot_password', standardPipeline(AuthController.forgotPassword));

router.patch('/reset_password/:token', standardPipeline(AuthController.resetPassword));

router.use(deserializeUser, requireUser);
router
    .route('/me')
    .get(standardPipeline(AuthController.restrictTo(UserRole.traveler, UserRole.supplier), UserController.getMe))
    .patch(standardPipeline(AuthController.restrictTo(UserRole.traveler, UserRole.supplier), UserController.updateMe));

router.patch('/update_password', standardPipeline(UserController.updatePassword));


export default router;