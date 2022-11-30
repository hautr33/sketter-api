import { Router } from "express";
import { standardPipeline } from "../pipes";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { completePlan, createPlan, deletePlan, getAllCreatedPlan, getAllPublicPlan, getOnePlan, saveDraftPlan, updatePlan } from "../controllers/app/plan.controller";
import { createSmartPlan, saveSmartPlan } from "../controllers/app/plan_smart.controller";

const router = Router();

router.use(deserializeUser, requireUser);


router.route('/')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllPublicPlan))


router.route('/smart/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), saveSmartPlan))

router.route('/checkin/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), completePlan))

router.route('/smart')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createSmartPlan))

router.route('/me')
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllCreatedPlan))

router.route('/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), saveDraftPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getOnePlan))
    .patch(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), updatePlan))
    .delete(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), deletePlan))


export default router;
