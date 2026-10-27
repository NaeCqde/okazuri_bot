import { and, asc, desc, eq, gte, lt, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import {
    fetchHtml,
    issueName,
    issueNumber,
    labelListUrl,
    parseDetail,
    parseList,
    PER_PAGE,
    productUrl,
    type ListItem,
} from './dlsite';
import { authors, magazines, numbers, works, type Magazine, type Work } from './schema';

/** 号・作品が見つからなかったとき(ユーザーの入力違いなので、エラーとしては扱わない) */
export class NotFoundError extends TypeError {}

export type NumberRow = InferSelectModel<typeof numbers>;
export type WorkWithAuthor = Work & { authorName: string };

/** Discord のオートコンプリートの候補の上限 */
const MAX_CHOICES = 25;

/** 号の名前から、掲載作品を号の中の並び(position)順に返す */
export async function listWorks(
    db: DrizzleD1Database,
    name: string
): Promise<{ number: NumberRow; works: WorkWithAuthor[] }> {
    const [number] = await db.select().from(numbers).where(eq(numbers.name, name)).limit(1);

    if (!number) throw new NotFoundError('no number found');

    const rows = await db
        .select({ work: works, authorName: authors.name })
        .from(works)
        .innerJoin(authors, eq(works.authorId, authors.id))
        .where(eq(works.numberId, number.id))
        .orderBy(asc(works.position));

    return { number, works: rows.map((r) => ({ ...r.work, authorName: r.authorName })) };
}

/** 作品名から、掲載されている号を返す(同名の作品は複数返す) */
export async function findWorks(
    db: DrizzleD1Database,
    title: string
): Promise<{ work: Work; number: NumberRow; authorName: string }[]> {
    const rows = await db
        .select({ work: works, number: numbers, authorName: authors.name })
        .from(works)
        .innerJoin(numbers, eq(works.numberId, numbers.id))
        .innerJoin(authors, eq(works.authorId, authors.id))
        .where(eq(works.name, title))
        .orderBy(desc(numbers.date))
        .limit(10);

    if (!rows.length) throw new NotFoundError('no work found');

    return rows;
}

export async function toNumber(db: DrizzleD1Database, work: string): Promise<NumberRow> {
    return (await findWorks(db, work))[0].number;
}

/**
 * 号の名前のオートコンプリート(部分一致、新しい号から)。
 * 号は数百件なので全件を読んでも軽い。
 */
export async function searchNumberNames(db: DrizzleD1Database, query: string): Promise<string[]> {
    const q = query.trim();

    const rows = await db
        .select({ name: numbers.name })
        .from(numbers)
        .where(q ? sql`instr(${numbers.name}, ${q}) > 0` : undefined)
        .orderBy(desc(numbers.date))
        .limit(MAX_CHOICES);

    return rows.map((r) => r.name);
}

/**
 * 作品名のオートコンプリート。
 * 作品は数千件あり、LIKE の部分一致は全件を読むので(D1 は読み取った行数に上限がある)、
 * 3文字以上は全文検索の索引(works_fts、trigram)で部分一致、2文字以下は前方一致にする。
 */
export async function searchWorkNames(db: DrizzleD1Database, query: string): Promise<string[]> {
    const q = query.trim();

    if (!q) return [];

    if ([...q].length >= 3) {
        // フレーズとして検索する(" は二重にしてエスケープ)。前方一致を先に、短いタイトルを先にする
        const phrase = `"${q.replaceAll('"', '""')}"`;

        const rows = await db.all<{ name: string }>(sql`
            select name from (
                select distinct w.name as name
                from works_fts f join works w on w.rowid = f.rowid
                where works_fts match ${phrase}
            )
            order by (instr(lower(name), lower(${q})) = 1) desc, length(name), name
            limit ${MAX_CHOICES}`);

        return rows.map((r) => r.name);
    }

    const rows = await db
        .selectDistinct({ name: works.name })
        .from(works)
        .where(and(gte(works.name, q), lt(works.name, q + '￿')))
        .orderBy(asc(works.name))
        .limit(MAX_CHOICES);

    return rows.map((r) => r.name);
}

/**
 * 一括取り込み(scripts/import.ts)の対象にする DLsite のレーベルID。
 * 新しいレーベルはここにIDを足すだけでよい(名前・進捗は初回の取得で magazines に作られる)。
 */
export const KNOWN_MAGAZINE_IDS: string[] = [
    'LBL02690', // COMIC快楽天
    'LBL02558', // COMIC快楽天ビースト
    'LBL02655', // COMIC失楽天
    'LBL00611', // COMIC E×E
    'LBL03007', // COMICペンギンクラブ
    'LBL03712', // コミックグレープ
    'LBL02544', // COMIC ゼロス(旧 COMIC X-EROS)
    'LBL00255', // comicアンスリウム
    'LBL02053', // comicクリベロン DUMA
    'LBL01003', // コミックマグナム
    'LBL00334', // COMICエウロパ
];

/**
 * cron で毎日、差分を取るレーベルのID。
 * 一括取り込みが済んだレーベルを KNOWN_MAGAZINE_IDS から足していく。
 */
export const MAGAZINE_IDS: string[] = [
    'LBL02690', // COMIC快楽天
];

// Workers の1回の実行で許されるサブリクエスト数(無料プランは50)に収める。有料プランなら増やせる
const DEFAULT_MAX_REQUESTS = 45;

// D1 は1クエリあたりのバインド変数が100個まで
const MAX_PARAMS = 100;

// 一覧の先頭からこの件数までは、保存済みの号でも毎回、新しい単話がないか確認する。
// 単話は号の発売後に追加されることがあり、追加されるのは直近の号が多いため
const RESCAN_ITEMS = PER_PAGE;

class BudgetExhausted extends Error {}

class RequestBudget {
    used: number = 0;

    constructor(private remaining: number) {}

    take(): void {
        if (this.remaining <= 0) throw new BudgetExhausted();
        this.remaining--;
        this.used++;
    }
}

interface Pending {
    magazineName?: string;
    numbers: InferInsertModel<typeof numbers>[];
    authors: Map<string, InferInsertModel<typeof authors>>;
    works: InferInsertModel<typeof works>[];
}

interface Group {
    issue: ListItem;
    // 号の掲載作品(DLsite の並び = 新しい順)
    candidates: ListItem[];
    // この号までに読んだ一覧の件数
    seen: number;
}

interface Progress {
    cursor: string | null;
    completed: boolean;
}

/**
 * DLsite のレーベルページから雑誌の号と掲載作品を取得して保存する。
 *
 * magazineId は DLsite のレーベルID(LBL00611 など)。
 * レーベルの一覧は新しい順で、「単話 … 単話 → 雑誌」の並びになっている。
 * 雑誌の直前(1つ新しい雑誌より後)にある単話を、その号の掲載作品とする。
 *
 * 差分は号と作品のIDで取る。
 * - 号が未保存: 号の詳細ページから販売日を取り、号と単話をまとめて保存する
 * - 号が保存済み: 未保存の単話(と並びが変わった単話)だけを保存する(詳細ページは取らない)
 * 単話には号の中での並び(position)を、号に近い(古い)ほうから 1, 2, 3... と振る。
 *
 * 進捗は magazines に持つ。
 * - cursorNumberId: 一覧の先頭からここまでの号は保存済み
 * - completed: 一覧の末尾まで保存し終えた。保存済みなら、先頭1ページ(RESCAN_ITEMS)より
 *   後ろで保存済みの号に当たった時点で走査を終える
 */
export class Fetcher {
    constructor(
        private db: DrizzleD1Database,
        private maxRequests: number = DEFAULT_MAX_REQUESTS
    ) {}

    /**
     * 続きが残ったレーベル(pending)と失敗したレーベル(failed)を返す。
     * 呼び出しごとのリクエスト数の上限は fetchMagazines が呼び出しを分けて越える。
     */
    async run(magazineIds: string[] = MAGAZINE_IDS): Promise<RunResult> {
        const result: RunResult = { pending: [], failed: [] };

        if (!magazineIds.length) return result;

        // 先頭のレーベルが予算を使い切らないように等分する
        const maxRequests = Math.floor(this.maxRequests / magazineIds.length);

        for (const magazineId of magazineIds) {
            try {
                const completed = await this.fetchAndSaveWorksDiffFromMagazine(
                    magazineId,
                    maxRequests
                );

                if (!completed) result.pending.push(magazineId);
            } catch (e) {
                // drizzle は元のエラーを cause に入れる
                console.error(`okazuri: failed to fetch ${magazineId}`, e, (e as any)?.cause);
                result.failed.push(magazineId);
            }
        }

        return result;
    }

    /** 並びの末尾まで保存し終えたら true。予算を使い切って途中で止まったら false */
    async fetchAndSaveWorksDiffFromMagazine(
        magazineId: string,
        maxRequests: number = this.maxRequests
    ): Promise<boolean> {
        const budget = new RequestBudget(maxRequests);

        const [magazine] = await this.db.select().from(magazines).where(eq(magazines.id, magazineId));

        const knownNumbers = new Map<string, Date>(
            (
                await this.db
                    .select({ id: numbers.id, date: numbers.date })
                    .from(numbers)
                    .where(eq(numbers.magazineId, magazineId))
            ).map((n) => [n.id, n.date])
        );
        // 作品ID -> 号の中の並び
        const knownWorks = new Map<string, number>(
            (
                await this.db
                    .select({ id: works.id, position: works.position })
                    .from(works)
                    .innerJoin(numbers, eq(works.numberId, numbers.id))
                    .where(eq(numbers.magazineId, magazineId))
            ).map((w) => [w.id, w.position])
        );

        const pending: Pending = { numbers: [], authors: new Map(), works: [] };

        // 前回までに末尾まで保存済みなら、cursor(=末尾)は動かさない
        const backfilling = !magazine?.completed;
        const progress: Progress = { cursor: magazine?.cursorNumberId ?? null, completed: false };

        let issues = 0;

        try {
            for await (const { issue: item, candidates, seen } of this.listGroups(
                magazineId,
                budget
            )) {
                issues++;

                const knownDate = knownNumbers.get(item.id);

                if (knownDate) {
                    // これより古い号は保存済みなので、直近の分を確認し終えたらここで終わり
                    if (!backfilling && seen > RESCAN_ITEMS) break;

                    this.collectWorks(item.id, knownDate, candidates, knownWorks, pending);
                } else {
                    // 失敗したら飛ばさずに止める(飛ばすと cursor が未保存の号を越えてしまう)
                    await this.collectIssue(magazineId, item, candidates, !magazine, pending, budget);
                }

                if (backfilling) progress.cursor = item.id;
            }

            progress.completed = true;

            if (!issues) {
                console.warn(`okazuri: ${magazineId}: no issues found. is the label id correct?`);
            }
        } catch (e) {
            if (!(e instanceof BudgetExhausted)) throw e;

            console.warn(`okazuri: ${magazineId}: request budget exhausted, will continue next run`);
        } finally {
            await this.save(magazineId, magazine, pending, progress);

            console.log(
                `okazuri: ${magazineId}: +${pending.numbers.length} numbers, +${pending.works.length} works` +
                    ` (requests: ${budget.used}, cursor: ${progress.cursor}, completed: ${progress.completed})`
            );
        }

        return progress.completed;
    }

    /**
     * 一覧を「号と、その直前の単話」のまとまりに分ける。
     *
     * 同じ号の【デジタル特装版】などの別商品(号名が同じで【】の注記だけが違う)は、
     * 単話の途中に並ぶことがあるので、通常版にまとめる。
     */
    private async *listGroups(magazineId: string, budget: RequestBudget): AsyncGenerator<Group> {
        // 直前の雑誌より後(=この雑誌より前)に並んでいた単話
        let singles: ListItem[] = [];
        // 【】の注記つきの号。次の号が同じ号なら、その号にまとめる
        let held: Group | null = null;
        let seen = 0;

        for await (const item of this.listLabel(magazineId, budget)) {
            seen++;

            if (item.type === 'oneshot') {
                singles.push(item);
                continue;
            }
            if (item.type !== 'magazine') continue;

            const group: Group = { issue: item, candidates: singles, seen };
            singles = [];

            if (held) {
                if (issueName(held.issue.name) === issueName(item.name)) {
                    group.candidates = [...held.candidates, ...group.candidates];
                } else {
                    yield held;
                }

                held = null;
            }

            if (issueName(item.name) !== item.name.trim()) held = group;
            else yield group;
        }

        if (held) yield held;
    }

    private async *listLabel(magazineId: string, budget: RequestBudget): AsyncGenerator<ListItem> {
        for (let page = 1; ; page++) {
            budget.take();

            const items = parseList(await fetchHtml(labelListUrl(magazineId, page)));

            yield* items;

            if (items.length < PER_PAGE) return;
        }
    }

    private async collectIssue(
        magazineId: string,
        issue: ListItem,
        candidates: ListItem[],
        needMagazine: boolean,
        pending: Pending,
        budget: RequestBudget
    ) {
        budget.take();

        const detail = parseDetail(await fetchHtml(productUrl(issue.id)));
        if (!detail) throw Error(`okazuri: release date not found: ${issue.id}`);

        if (needMagazine && !pending.magazineName) {
            pending.magazineName = detail.labelName ?? magazineId;
        }

        pending.numbers.push({
            id: issue.id,
            name: issueName(issue.name),
            num: issueNumber(issue.name),
            date: detail.date,
            magazineId,
        });

        this.collectWorks(issue.id, detail.date, candidates, new Map(), pending);
    }

    /**
     * group は号の掲載作品(DLsite の並び = 新しい順)。
     * 末尾(号に近い側)から 1, 2, 3... と並びを振り、未保存か並びが変わった作品だけを保存対象にする。
     */
    private collectWorks(
        numberId: string,
        date: Date,
        group: ListItem[],
        knownWorks: Map<string, number>,
        pending: Pending
    ) {
        group.forEach((work, i) => {
            const position = group.length - i;

            if (knownWorks.get(work.id) === position) return;

            if (!work.authorId || !work.authorName) {
                console.warn(`okazuri: skipped ${work.id} (${work.name}): author not found`);
                return;
            }

            pending.authors.set(work.authorId, { id: work.authorId, name: work.authorName });
            pending.works.push({
                id: work.id,
                name: work.name,
                date,
                position,
                numberId,
                authorId: work.authorId,
            });
        });
    }

    private async save(
        magazineId: string,
        magazine: Magazine | undefined,
        pending: Pending,
        progress: Progress
    ) {
        const statements: BatchItem<'sqlite'>[] = [];

        const name = magazine?.name ?? pending.magazineName;
        const changed =
            !magazine ||
            magazine.cursorNumberId !== progress.cursor ||
            magazine.completed !== progress.completed;

        if (name && changed) {
            const state = { cursorNumberId: progress.cursor, completed: progress.completed };

            statements.push(
                this.db
                    .insert(magazines)
                    .values({ id: magazineId, name, ...state })
                    .onConflictDoUpdate({ target: magazines.id, set: state })
            );
        }

        for (const rows of chunks(pending.numbers, Math.floor(MAX_PARAMS / 5))) {
            statements.push(this.db.insert(numbers).values(rows).onConflictDoNothing());
        }

        for (const rows of chunks([...pending.authors.values()], Math.floor(MAX_PARAMS / 2))) {
            statements.push(
                this.db
                    .insert(authors)
                    .values(rows)
                    .onConflictDoUpdate({ target: authors.id, set: { name: sql`excluded.name` } })
            );
        }

        // 保存済みの作品は並びだけを更新する
        for (const rows of chunks(pending.works, Math.floor(MAX_PARAMS / 6))) {
            statements.push(
                this.db
                    .insert(works)
                    .values(rows)
                    .onConflictDoUpdate({
                        target: works.id,
                        set: { position: sql`excluded.position` },
                    })
            );
        }

        // 外部キーの順(雑誌 → 号 → 作者 → 作品)で、1トランザクションで書く
        if (statements.length) {
            await this.db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
        }
    }
}

export interface RunResult {
    /** 予算を使い切って、続きが残っているレーベルのID */
    pending: string[];
    /** 失敗したレーベルのID */
    failed: string[];
}

// 1回の cron で、取得を呼び出す回数の上限(cron の実行時間の上限に収める)
const MAX_INVOCATIONS = 40;

/**
 * 取得を、1レーベルずつ別の呼び出し(run)で実行する。
 *
 * Workers はリクエスト数(サブリクエスト)の上限が1回の呼び出しごとにあるので、
 * 予算を使い切って続きが残ったレーベルは、新しい呼び出しで続きを取る。
 * run には自分自身へのサービスバインディング越しの呼び出しを渡す。
 * 失敗したレーベルがあれば、すべて終えたあとに例外を投げる。
 */
export async function fetchMagazines(
    run: (magazineIds: string[]) => Promise<RunResult>,
    magazineIds: string[] = MAGAZINE_IDS,
    maxInvocations: number = MAX_INVOCATIONS
): Promise<void> {
    let pending = [...magazineIds];
    const failed: string[] = [];
    let invocations = 0;

    while (pending.length && invocations < maxInvocations) {
        const next: string[] = [];

        for (const magazineId of pending) {
            if (invocations >= maxInvocations) {
                next.push(magazineId);
                continue;
            }

            invocations++;

            const result = await run([magazineId]);

            if (result.failed.length) failed.push(magazineId);
            else if (result.pending.length) next.push(magazineId);
        }

        pending = next;
    }

    if (pending.length) {
        console.warn(`okazuri: invocation limit reached, will continue next run: ${pending.join(', ')}`);
    }

    console.log(`okazuri: fetched with ${invocations} invocations`);

    if (failed.length) throw Error(`okazuri: failed to fetch: ${failed.join(', ')}`);
}

function chunks<T>(rows: T[], size: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));

    return result;
}
