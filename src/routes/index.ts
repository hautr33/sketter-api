import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import destination from "./destination.route";
import catalog from "./catalog.route";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../utils/catchAsync";
import { Role } from "../models/role.model";
import { Catalog } from "../models/catalog.model";
import { TravelPersonalityType } from "../models/personalityType.model";

const router = express.Router();

router.get("/healthcheck", (_, res) => res.status(StatusCodes.OK).send({ "status": "success", "message": "Welcome to Sketter" }));

router.use('/api/v1/auth', auth);
router.use('/api/v1/user', user);
router.use('/api/v1/destination', destination);
router.use('/api/v1/catalog', catalog);


// just for test
router.get('/initData', catchAsync(async (_req, res, _next) => {
    enum roles {
        'Admin' = 1,
        'Supplier Manager',
        'Supplier',
        'Traveler',
    }
    for (let i = 1; i <= 4; i++) {
        const [role, created] = await Role.findOrCreate({
            where: { id: i },
            defaults: {
                name: roles[i]
            }
        });
        if (!created) {
            role.name = roles[i];
            await role.save();
        }
    }
    enum catalogs {
        'Quán ăn' = 1,
        'Quán cà phê',
        'Địa điểm du lịch',
        'Homestay',
        'Khách sạn',
        'Biệt thự',
        'Khu nghỉ dưỡng cao cấp',
        'Nhà xe'
    }
    for (let i = 1; i <= 8; i++) {
        const [created] = await Catalog.findOrCreate({
            where: { id: i },
            defaults: {
                name: catalogs[i]
            }
        });
        if (!created) {
            Catalog.update({
                name: catalogs[i]
            }, { where: { id: i } })
        }
    }
    enum personalityTypes {
        'Thích khám phá' = 1,
        'Ưa mạo hiểm',
        'Tìm kiếm sự thư giãn',
        'Đam mê với ẩm thực',
        'Đam mê với lịch sử, văn hóa',
        'Yêu thiên nhiên',
        'Giá rẻ là trên hết',
        'Có nhu cầu vui chơi, giải trí cao'
    }
    for (let i = 1; i <= 8; i++) {
        const [personalityType, created] = await TravelPersonalityType.findOrCreate({
            where: { id: i },
            defaults: {
                name: personalityTypes[i]
            }
        });
        if (!created) {
            personalityType.name = personalityTypes[i];
            await personalityType.save();
        }
    }
    res.status(StatusCodes.OK).send('Init data success')
}));
export default router;