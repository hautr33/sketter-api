import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { approveDestination, bookmarkDestination, closeDestination, createDestination, deleteOneDestination, getAllDestination, getBookmarkDestination, getOneDestination, getPendingDestination, getRejectDestination, rejectDestination, searchDestination, updateDestination } from "../controllers/app/destination.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getAllDestination))
    .post(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), createDestination));

router.route('/search')
    .get(standardPipeline(restrictTo(Roles.Traveler), searchDestination))

router.route('/bookmark')
    .get(standardPipeline(restrictTo(Roles.Traveler), getBookmarkDestination))
    .post(standardPipeline(restrictTo(Roles.Traveler), bookmarkDestination))

router.route('/pending')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"]), getPendingDestination))


router.route('/reject')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"]), getRejectDestination))

router.route('/pending/reject')
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"]), rejectDestination))

router.route('/pending/approve')
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"]), approveDestination))

router.route('/pending/close')
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"]), closeDestination))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier, Roles.Traveler), getOneDestination))
    .patch(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), updateDestination))
    .delete(standardPipeline(restrictTo(Roles["Supplier Manager"], Roles.Supplier), deleteOneDestination))

export default router;