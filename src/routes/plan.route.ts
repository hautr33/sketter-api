import { Router } from "express";
import { standardPipeline } from "../pipes";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { createPlan, deletePlan, getAllCreatedPlan, getAllPublicPlan, getOnePlan, updatePlan } from "../controllers/app/plan.controller";
import { createSmartPlan } from "../controllers/app/plan_smart.controller";

const router = Router();

router.use(deserializeUser, requireUser);


router.route('/')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllPublicPlan))

router.route('/smart')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createSmartPlan))

router.route('/me')
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllCreatedPlan))

router.route('/:id')
    .get(standardPipeline(restrictTo(Roles.Traveler), getOnePlan))
    .patch(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), updatePlan))
    .delete(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), deletePlan))


export default router;
