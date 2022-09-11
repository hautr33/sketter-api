import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { approveDestination, createDestination, deleteOneDestination, getAllDestination, getOneDestination, getPendingDestination, updateDestination } from "../controllers/app/destination.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getAllDestination))
    .post(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), createDestination));

router.route('/pending')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"]), getPendingDestination))

router.route('/approve/:id')
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"]), approveDestination))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getOneDestination))
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), updateDestination))
    .delete(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), deleteOneDestination))



export default router;