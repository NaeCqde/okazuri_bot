import { createApplicationCommandHandler, Permissions } from "@discordcf/framework";

import { setEnv } from "./envs.js";

import { searchCommand } from "./cmd/search.js";
import { searchThisCommand } from "./cmd/search_this.js";

let applicationCommandHandler: (request: Request) => Promise<Response>;

export default {
    fetch: async (request: Request, env: Env, context: ExecutionContext): Promise<Response> => {
        setEnv(env);

        if (!applicationCommandHandler) {
            applicationCommandHandler = createApplicationCommandHandler(
                {
                    applicationId: env.APPLICATION_ID,
                    publicKey: env.PUBLIC_KEY,
                    botToken: env.BOT_TOKEN,
                    commands: [searchCommand, searchThisCommand],
                    permissions: new Permissions([
                        "ViewChannel",
                        "ReadMessageHistory",
                        //"EmbedLinks",
                    ]),
                },
                env,
                context
            );
        }

        if (new URL(request.url).pathname === "/setup") {
            console.log("setup");
        }

        return await applicationCommandHandler(request);
    },
};
