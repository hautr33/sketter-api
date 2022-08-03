import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import destination from "./destination.route";
import catalog from "./catalog.route";
import personalityType from "./personalityType.route";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../utils/catchAsync";
import { Role } from "../models/role.model";
import { Catalog } from "../models/catalog.model";
import { TravelPersonalityType } from "../models/personalityType.model";
import { Catalogs, PersonalityTypes, Roles } from "../utils/constant";

const router = express.Router();

router.get("/healthcheck", (_, res) => res.status(StatusCodes.OK).send({ "status": "success", "message": "Welcome to Sketter" }));

router.use('/api/v1/auth', auth);
router.use('/api/v1/user', user);
router.use('/api/v1/destination', destination);
router.use('/api/v1/catalog', catalog);
router.use('/api/v1/travel_personality_type', personalityType);


// just for test
router.get('/initData', catchAsync(async (_req, res, _next) => {
    for (let i = 1; i <= Object.keys(Roles).length / 2; i++) {
        await Role.upsert({
            id: i,
            name: Roles[i]
        });
    }

    for (let i = 1; i <= Object.keys(Catalogs).length / 2; i++) {
        await Catalog.upsert({
            id: i,
            name: Catalogs[i]
        });
    }

    for (let i = 1; i <= Object.keys(PersonalityTypes).length / 2; i++) {
        await TravelPersonalityType.upsert({
            id: i,
            name: PersonalityTypes[i]
        });
    }
    res.status(StatusCodes.OK).send('Init data success')
}));
export default router;