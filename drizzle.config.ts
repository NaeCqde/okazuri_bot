import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!(process.env.CF_ACCOUNT_ID && process.env.CF_DATABASE_ID && process.env.CF_TOKEN))
    throw Error(".env's variable is not defined");

export default defineConfig({
    dialect: 'sqlite',
    driver: 'd1-http',
    schema: 'src/schema.ts',
    out: 'drizzle/migrations',
    dbCredentials: {
        accountId: process.env.CF_ACCOUNT_ID,
        databaseId: process.env.CF_DATABASE_ID,
        token: process.env.CF_TOKEN,
    },
});
