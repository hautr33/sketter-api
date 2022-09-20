import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import destination from "./destination.route";
import catalog from "./catalog.route";
import personalities from "./personalities.route";
import plan from "./plan.route";
import { StatusCodes } from "http-status-codes";

const router = express.Router();

router.get("/healthcheck", (_, res) => res.status(StatusCodes.OK).send({ "status": "success", "message": "Welcome to Sketter" }));

router.use('/api/v1/auth', auth);
router.use('/api/v1/user', user);
router.use('/api/v1/destination', destination);
router.use('/api/v1/catalog', catalog);
router.use('/api/v1/personalities', personalities);
router.use('/api/v1/plan', plan);

export default router;