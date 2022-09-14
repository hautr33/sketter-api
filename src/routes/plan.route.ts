import { Router } from "express";
import { standardPipeline } from "../pipes";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { createPlan, deletePlan, getAllCreatedPlan, getAllPublicPlan, getOnePlan, updatePlan } from "../controllers/app/plan.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/me')
    .post(standardPipeline(restrictTo(Roles.Traveler), createPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllCreatedPlan))

router
    .route('/public')
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllPublicPlan))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles.Traveler), getOnePlan))
    .patch(standardPipeline(restrictTo(Roles.Traveler), updatePlan))
    .delete(standardPipeline(restrictTo(Roles.Traveler), deletePlan))


export default router;
