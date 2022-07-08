import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import UserController from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";

const router = Router();
router.use(deserializeUser, requireUser);
router.get('/me', standardPipeline(UserController.getMe));


export default router;