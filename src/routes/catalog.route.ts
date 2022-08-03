import { Router } from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { standardPipeline } from "../pipes";
import { getAllCatalog } from "../controllers/app/catalog.controller";

const router = Router();

router.use(deserializeUser, requireUser);
router.get('/', standardPipeline(getAllCatalog));

export default router;