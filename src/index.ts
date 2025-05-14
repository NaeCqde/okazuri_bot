import { DiscordHono, register } from 'discord-hono';
import { Hono } from 'hono';

import { Fetcher } from './magazines.js';

const bot = new DiscordHono();
bot.cron('0 0 * * *', async () => {
    await new Fetcher().run(['LBL00611']);
});

const hono = new Hono();
hono.mount('/interaction', bot.fetch);

hono.get('/setup', async (ctx) => {
    await register();

    return ctx.text('setup');
});

export default {
    fetch: hono.fetch,
    scheduled: bot.scheduled,
};

/*
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

        

const commands = [
  new Command('hello', 'response world'),
  new Command('help', 'response help').options(new Option('text', 'with text')),
]

register(

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
*/
