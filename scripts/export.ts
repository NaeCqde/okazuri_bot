// ローカル D1 のレーベルを、本番 D1 に流し込む SQL にする。
//   pnpm run export                    KNOWN_MAGAZINE_IDS から MAGAZINE_IDS(cron で取るレーベル)を除いた分
//   pnpm run export LBL02690 ...       指定したレーベルだけ
// 出力: .wrangler/import/okazuri-import.sql
//   wrangler d1 execute okazuri --remote --file .wrangler/import/okazuri-import.sql
// すべて INSERT OR IGNORE なので、本番にある行は上書きしない。
import { mkdirSync, writeFileSync } from 'node:fs';
import { KNOWN_MAGAZINE_IDS, MAGAZINE_IDS } from '../src/magazines';

const OUT_DIR = '.wrangler/import';
const OUT_FILE = `${OUT_DIR}/okazuri-import.sql`;

function literal(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);

    return `'${String(value).replaceAll("'", "''")}'`;
}

function insert(table: string, rows: Record<string, unknown>[]): string[] {
    return rows.map((row) => {
        const columns = Object.keys(row);

        return (
            `INSERT OR IGNORE INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) ` +
            `VALUES (${columns.map((c) => literal(row[c])).join(', ')});`
        );
    });
}

async function main() {
    const { getPlatformProxy } = await import('wrangler');

    const args = process.argv.slice(2);
    const ids = args.length ? args : KNOWN_MAGAZINE_IDS.filter((id) => !MAGAZINE_IDS.includes(id));

    const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>();
    const all = async (sql: string, ...binds: unknown[]) =>
        (await env.DB.prepare(sql).bind(...binds).all()).results as Record<string, unknown>[];

    const statements: string[] = [];
    const counts: Record<string, number> = { magazines: 0, numbers: 0, authors: 0, works: 0 };

    try {
        for (const id of ids) {
            const magazine = await all('select * from magazines where id = ?', id);
            if (!magazine.length) throw Error(`okazuri: ${id} is not imported yet`);

            const rows = {
                magazines: magazine,
                numbers: await all('select * from numbers where magazine_id = ? order by id', id),
                authors: await all(
                    `select * from authors where id in (
                        select w.author_id from works w join numbers n on n.id = w.number_id
                        where n.magazine_id = ?) order by id`,
                    id
                ),
                works: await all(
                    `select w.* from works w join numbers n on n.id = w.number_id
                     where n.magazine_id = ? order by w.id`,
                    id
                ),
            };

            // 外部キーの順(雑誌 → 号 → 作者 → 作品)
            for (const [table, tableRows] of Object.entries(rows)) {
                statements.push(...insert(table, tableRows));
                counts[table] += tableRows.length;
            }
        }
    } finally {
        await dispose();
    }

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, statements.join('\n') + '\n');

    console.log(`labels: ${ids.join(', ')}`);
    console.log(counts, `-> ${OUT_FILE} (${statements.length} statements)`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
