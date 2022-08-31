import { TravelPersonalityType } from "../../models/personality_type.model";
import { getAll } from "../factory/crud.factory";

export const getAllPersonalityType = getAll(TravelPersonalityType, { order: [['name', 'ASC']] });