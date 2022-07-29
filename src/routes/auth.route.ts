import { Router } from "express";
import { standardPipeline } from "../pipes";
import { signup, login, logout } from "../controllers/app/auth.controller";
import { addRoleMiddleware } from "../middlewares/field.middleware";
import { UserRole } from "../utils/constant";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";

const router = Router();
//Signup route
router.post('/signup', addRoleMiddleware(UserRole.traveler), standardPipeline(signup));

router.post('/signup/supplier', addRoleMiddleware(UserRole.supplier), standardPipeline(signup));

router.post('/login', standardPipeline(login));

router.use(deserializeUser, requireUser);
router.post('/logout', standardPipeline(logout));



export default router;