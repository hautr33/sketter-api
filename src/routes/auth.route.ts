import { Router } from "express";
import AuthController from "../controllers/app/auth.controller";

const router = Router();
//Login route
router.post("/signup", AuthController.signup);
router.get("/signupp", AuthController.signupp);

export default router;