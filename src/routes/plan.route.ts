import { Router } from "express";
import { standardPipeline } from "../pipes";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { createPlan } from "../controllers/app/plan.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .post(standardPipeline(restrictTo(Roles.Traveler), createPlan));

export default router;
