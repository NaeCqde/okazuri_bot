import { eq, type InferSelectModel } from 'drizzle-orm';

import { db } from './db/db.js';
import { numbers, works, type Work } from './db/schema.js';

export async function listWorks(number: string): Promise<Work[]> {
    const result = await db.select().from(numbers).where(eq(numbers.name, number));

    if (result.length) {
        const works_ = await db.select().from(works).where(eq(works.numberId, result[0].id));

        return works_;
    } else {
        throw TypeError('no number found');
    }
}

export async function toNumber(work: string): Promise<InferSelectModel<typeof numbers>> {
    const result = await db.select().from(works).where(eq(works.name, work));

    if (result.length) {
        const number = await db.select().from(numbers).where(eq(numbers.id, result[0].numberId));

        return number[0];
    } else {
        throw TypeError('no work found');
    }
}

export class Fetcher {
    async run(magazineIds: string[]) {}
    async fetchAndSaveWorksDiffFromMagazine(magazineId: string) {}
}
