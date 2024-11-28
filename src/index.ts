import { createApplicationCommandHandler, Permissions } from "@discordcf/framework";

import { searchCommand } from "./cmd/search.js";
import { searchThisCommand } from "./cmd/search_this.js";
import { setEnv } from "./env.js";

export default {
    fetch: async (request: Request, env: Env, context: ExecutionContext): Promise<Response> => {
        setEnv(env);

        const applicationCommandHandler = createApplicationCommandHandler(
            {
                applicationId: env.APPLICATION_ID,
                publicKey: env.PUBLIC_KEY,
                botToken: env.BOT_TOKEN,
                commands: [searchCommand, searchThisCommand],
                permissions: new Permissions(["ViewChannel", "ReadMessageHistory"]),
            },
            env,
            context
        );

        if (new URL(request.url).pathname === "/setup") {
            console.log("setup");
        }

        return await applicationCommandHandler(request);
    },
};
