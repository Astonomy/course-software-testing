import type { Express } from "express";
import type { Db } from "../kernel/db";
import { registerStore } from "./store";

export const slices: Array<(app: Express, db: Db) => void> = [registerStore];
