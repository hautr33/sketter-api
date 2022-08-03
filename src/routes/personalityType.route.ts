import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { standardPipeline } from "../pipes";
import { getAllPersonalityType } from "../controllers/app/personalityType.controller";

const router = Router();

router.use(deserializeUser, requireUser);
router.get('/', standardPipeline(getAllPersonalityType));

export default router;