import { register } from 'discord-hono';
import * as handlers from './cmd';
import { factory } from './init';

register(
    factory.getCommands(Object.values(handlers)),
    process.env.APPLICATION_ID,
    process.env.BOT_TOKEN
);
