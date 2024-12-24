import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";

import { env } from "../env.js";

export function getDB(): DrizzleD1Database {
    return drizzle(env.DB);
}
