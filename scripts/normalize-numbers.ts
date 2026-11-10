// 号の名前(numbers.name)を、ISSUE_SPECS(src/issue-name.ts)の書式にそろえ直す SQL を作る。
// 元のタイトル(numbers.name_raw)から作るので、ISSUE_SPECS を変えたあとに何度でも実行できる。
//   pnpm run normalize                 ローカル D1 の号を読む
//   pnpm run normalize <json>          wrangler d1 execute --remote --json の出力を読む。次の結果:
//     wrangler d1 execute okazuri --remote --json \
//       --command "select distinct magazine_id, name_raw, name, num from numbers" > numbers.json
// 出力: .wrangler/import/normalize-numbers.sql(いまの名前と違う号の分だけ)
//   wrangler d1 execute okazuri --remote --file .wrangler/import/normalize-numbers.sql
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { normalizeIssueName } from '../src/issue-name';

const OUT_DIR = '.wrangler/import';
const OUT_FILE = `${OUT_DIR}/normalize-numbers.sql`;

interface Row {
    magazine_id: string;
    name_raw: string;
    name: string;
    num: number;
}

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;

async function readRows(): Promise<Row[]> {
    const file = process.argv[2];

    if (file) {
        const text = readFileSync(file, 'utf8');

        // wrangler は JSON の前に案内を出すことがある
        return JSON.parse(text.slice(text.indexOf('[')))[0].results;
    }

    const { getPlatformProxy } = await import('wrangler');
    const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>();

    try {
        return (await env.DB.prepare('select distinct magazine_id, name_raw, name, num from numbers').all<Row>()).results;
    } finally {
        await dispose();
    }
}

async function main() {
    const rows = await readRows();
    const statements = rows.flatMap((row) => {
        const { name, num } = normalizeIssueName(row.magazine_id, row.name_raw);

        // 変わらない号は書き込まない(D1 は書き込んだ行数にも上限がある)
        if (name === row.name && num === row.num) return [];

        // name_raw で絞るので、名前を書き換えた行を、あとの文が巻き込むことはない
        return [
            `UPDATE \`numbers\` SET \`name\` = ${quote(name)}, \`num\` = ${num} ` +
            `WHERE \`magazine_id\` = ${quote(row.magazine_id)} AND \`name_raw\` = ${quote(row.name_raw)};`,
        ];
    });

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, statements.join('\n') + '\n');

    console.log(`${statements.length} statements -> ${OUT_FILE}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
