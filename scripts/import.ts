// 手元(ローカル D1)に、レーベルの全件を取り込む。
//   pnpm run import                 KNOWN_MAGAZINE_IDS すべて
//   pnpm run import LBL02690 ...    指定したレーベルだけ
import { drizzle } from 'drizzle-orm/d1';
import { Fetcher, KNOWN_MAGAZINE_IDS } from '../src/magazines';

// DLsite への負荷を抑えるため、リクエストの間隔を空ける
const DELAY_MS = 250;

async function main() {
    const { getPlatformProxy } = await import('wrangler');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

        return originalFetch(...args);
    };

    const ids = process.argv.slice(2);
    const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>();

    try {
        // Workers のリクエスト数の上限がないので、予算は実質無制限にする
        const result = await new Fetcher(drizzle(env.DB), Number.MAX_SAFE_INTEGER).run(
            ids.length ? ids : KNOWN_MAGAZINE_IDS
        );

        if (result.failed.length) throw Error(`failed to import: ${result.failed.join(', ')}`);
    } finally {
        await dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
