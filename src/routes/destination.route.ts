import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { standardPipeline } from "../pipes";
import { restrictTo } from "../controllers/app/auth.controller";
import { UserRole } from "../utils/constant";
import { create } from "../controllers/app/destination.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router.post('/create', standardPipeline(restrictTo(UserRole.supplierManager, UserRole.supplier), create));


export default router;