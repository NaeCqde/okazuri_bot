import { createFactory } from 'discord-hono';
import type { EnvTypes } from './types';

export const factory = createFactory<EnvTypes>();
