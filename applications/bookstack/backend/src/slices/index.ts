import type { Express } from "express";
import type { Db } from "../kernel/db";
import { registerBookStack } from "./bookstack";

export const slices: Array<(app: Express, db: Db) => void> = [registerBookStack];
