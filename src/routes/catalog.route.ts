import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { getAllCatalog } from "../controllers/app/catalog.controller";

const router = Router();

router.use(deserializeUser, requireUser);
router.get('/', standardPipeline(getAllCatalog));

export default router;