import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';

import { env } from '../env.js';

export const db: DrizzleD1Database = drizzle(env.DB);
