import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import test from "./test";
import { StatusCodes } from "http-status-codes";

const router = express.Router();

router.get("/healthcheck", (_, res) => res.status(StatusCodes.OK).send({"status":"success","message":"Welcome to Sketter"}));

router.use('/api/v1/auth', auth);
router.use('/api/v1/user', user);
router.use('/api/v1/firebase', test);

export default router;