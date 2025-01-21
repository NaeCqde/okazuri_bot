import { createApplicationCommandHandler, Permissions } from '@discordcf/framework';

import { fromWorkCommand } from './cmd/magazine/from_work.js';
import { worksCommand } from './cmd/magazine/works.js';
import { searchCommand } from './cmd/search.js';
import { searchThisCommand } from './cmd/search_this.js';

import { setEnv } from './env.js';
import { Fetcher } from './magazines.js';

export default {
    async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
        setEnv(env);

        const applicationCommandHandler = createApplicationCommandHandler(
            {
                applicationId: env.APPLICATION_ID,
                publicKey: env.PUBLIC_KEY,
                botToken: env.BOT_TOKEN,
                commands: [
                    searchCommand,
                    searchThisCommand,
                    //searchThisOptionCommand,
                    fromWorkCommand,
                    worksCommand,
                ],
                permissions: new Permissions(['ViewChannel', 'ReadMessageHistory']),
            },
            env,
            context
        );

        if (new URL(request.url).pathname === '/setup') {
            console.log('setup');
        }

        return await applicationCommandHandler(request);
    },
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        setEnv(env);

        await new Fetcher().run(['LBL00611']);
    },
};
