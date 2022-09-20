import { Personalities } from "../../models/personalites.model";
import { getAll } from "../factory/crud.factory";

export const getAllPersonalitiese = getAll(Personalities, { order: [['name', 'ASC']] });