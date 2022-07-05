import { Router } from "express";
import { standardPipeline } from "../pipes";
import AuthController from "../controllers/app/auth.controller";
import { addRoleMiddleware } from "../middlewares/field.middleware";
import { ROLE } from "../utils/constant.util";

const router = Router();
//Signup route
router.post('/signup', standardPipeline(AuthController.signup));

router.post('/login', standardPipeline(addRoleMiddleware(ROLE.TRAVELER, ROLE.SUPPLIER), AuthController.login));

export default router;