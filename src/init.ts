import { createFactory } from 'discord-hono'
import type { EnvTypes } from './types.js'

export const factory = createFactory<EnvTypes>()