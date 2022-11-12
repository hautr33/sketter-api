import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { createDestination, deleteOneDestination, getAllDestination, getOneDestination, searchDestination, updateDestination } from "../controllers/app/destination.controller";
import { deleteRating, getAllRating, ratingDestination, updateRating } from "../controllers/app/destination_rating.controller";
import { bookmarkDestination, getBookmarkDestination } from "../controllers/app/destination_bookmark.controller";
import { getDistance } from "../controllers/app/distance.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getAllDestination))
    .post(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), createDestination));

router.route('/search')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles["Supplier Manager"]), searchDestination))


router.route('/distance')
    .get(standardPipeline(restrictTo(Roles.Traveler), getDistance))

router.route('/bookmark')
    .get(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), getBookmarkDestination))

router.route('/:id/bookmark')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), bookmarkDestination))

router.route('/:id/deactivate')
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"]), requireStatus(Status.verified), bookmarkDestination))

router.route('/:id/rating')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), ratingDestination))
    .patch(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), updateRating))
    .delete(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), deleteRating))
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles["Supplier Manager"]), requireStatus(Status.verified), getAllRating))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getOneDestination))
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), updateDestination))
    .delete(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), requireStatus(Status.verified), deleteOneDestination))

export default router;