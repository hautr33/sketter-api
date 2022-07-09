import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import UserController from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";
import AuthController from "../controllers/app/auth.controller";

const router = Router();


router.post('/forgot_password', standardPipeline(AuthController.forgotPassword));

router.patch('/reset_password/:token', standardPipeline(AuthController.resetPassword));
router.use(deserializeUser, requireUser);
router.get('/me', standardPipeline(UserController.getMe));


export default router;