import { Router } from "express";
import { standardPipeline } from "../pipes";
import AuthController from "../controllers/app/auth.controller";
import { addRoleMiddleware } from "../middlewares/field.middleware";
import { Role } from "../utils/constant";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";

const router = Router();
//Signup route
router.post('/signup', addRoleMiddleware(Role.traveler), standardPipeline(AuthController.signup));

router.post('/signup/supplier', addRoleMiddleware(Role.supplier), standardPipeline(AuthController.signup));

router.post('/login', standardPipeline(AuthController.login));

router.use(deserializeUser, requireUser);
router.post('/logout', standardPipeline(AuthController.logout));



export default router;