import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { getAllPersonalityType } from "../controllers/app/personality_type.controller";

const router = Router();

router.use(deserializeUser, requireUser);
router.get('/', standardPipeline(getAllPersonalityType));

export default router;