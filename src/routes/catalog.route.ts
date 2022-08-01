import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { standardPipeline } from "../pipes";
import { getAll } from "../controllers/app/catalog.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router.get('/', standardPipeline(getAll));


export default router;