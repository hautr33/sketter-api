import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { activeVoucher, buyVoucher, createVoucher, deleteVoucher, duplicateVoucher, getAllVoucher, getAllVoucherDetail, getDestinationVoucher, getListDestnation, getOneVoucher, getOwnVoucher, getVnpReturn, updateVoucher } from "../controllers/app/voucher.controller";
import { checkVoucherOrder } from "../middlewares/voucher.middleware";

const router = Router();

router.route('/payment')
    .get(standardPipeline(getVnpReturn))

router.use(deserializeUser, requireUser, checkVoucherOrder);

router.route('/')
    .get(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), getAllVoucher))
    .post(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), createVoucher));

router.route('/destinations/:id')
    .get(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), getDestinationVoucher))

router.route('/destinations')
    .get(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), getListDestnation))


router.route('/:id/duplicate')
    .post(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), duplicateVoucher))

router.route('/active/:id')
    .post(standardPipeline(restrictTo(Roles.Supplier), activeVoucher))

router.route('/payment/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), buyVoucher))

router.route('/own')
    .get(standardPipeline(restrictTo(Roles.Traveler), getOwnVoucher))

router.route('/detail/:id')
    .get(standardPipeline(restrictTo(Roles.Supplier), getAllVoucherDetail))

router.route('/:id')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier), getOneVoucher))
    .patch(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), updateVoucher))
    .delete(standardPipeline(restrictTo(Roles.Supplier), requireStatus(Status.verified), deleteVoucher))

export default router;