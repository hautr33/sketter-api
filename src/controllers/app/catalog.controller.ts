import { Catalog } from "../../models/catalog.model";
import { getAll } from "../factory/crud.factory";

export const getAllCatalog = getAll(Catalog, { order: [['name', 'ASC']] });