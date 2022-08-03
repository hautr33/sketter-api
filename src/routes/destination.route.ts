import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { standardPipeline } from "../pipes";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { create } from "../controllers/app/destination.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router.post('/create', standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), create));


export default router;