import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { bookmarkDestination, createDestination, deleteOneDestination, getAllDestination, getBookmarkDestination, getOneDestination, searchDestination, updateDestination } from "../controllers/app/destination.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getAllDestination))
    .post(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), createDestination));

router.route('/search')
    .get(standardPipeline(restrictTo(Roles.Traveler), searchDestination))

router.route('/bookmark')
    .get(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), getBookmarkDestination))
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), bookmarkDestination))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getOneDestination))
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), updateDestination))
    .delete(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), deleteOneDestination))

export default router;