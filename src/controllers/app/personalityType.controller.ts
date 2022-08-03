import { TravelPersonalityType } from "../../models/personalityType.model";
import { getAll } from "../factory/crud.factory";

export const getAllPersonalityType = getAll(TravelPersonalityType, { order: [['name', 'ASC']] });