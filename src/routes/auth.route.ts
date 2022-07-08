import { Router } from "express";
import { standardPipeline } from "../pipes";
import AuthController from "../controllers/app/auth.controller";
import { addRoleMiddleware } from "../middlewares/field.middleware";
import { Role } from "../utils/constant";

const router = Router();
//Signup route
router.post('/signup', addRoleMiddleware(Role.Traveler), standardPipeline(AuthController.signup));

router.post('/signup/supplier', addRoleMiddleware(Role.Supplier), standardPipeline(AuthController.signupSupplier));

router.post('/login', standardPipeline(AuthController.login));

export default router;