import { and, asc, desc, eq, gte, inArray, lt, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import {
    fetchHtml,
    HttpError,
    issueName,
    issueNumber,
    labelListUrl,
    parseDetail,
    parseList,
    PER_PAGE,
    productUrl,
    type ListItem,
} from './dlsite';
import { normalizeIssueName } from './issue-name';
import { matches, nameKey, tier, type NameKey } from './number-search';
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
    let [number] = await db.select().from(numbers).where(eq(numbers.name, name)).limit(1);

    if (!number) {
        // 候補から選ばずに入力した場合(E×E 73、快楽天 2026 7 など)
        const resolved = await resolveNumberName(db, name);

        if (resolved) [number] = await db.select().from(numbers).where(eq(numbers.name, resolved)).limit(1);
    }

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

interface IndexedNumber {
    name: string;
    key: NameKey;
}

/** 号の名前の一覧を覚えておく時間。新しい号は、これだけ遅れて候補に出る */
const INDEX_TTL_MS = 5 * 60 * 1000;

let numberIndex: { loadedAt: number; entries: IndexedNumber[] } | undefined;

/**
 * 号の名前の一覧(新しい号から)。号は千件ほどで、入力のたびに DB から読むと、
 * 読み取った行数の上限(D1 の無料枠は1日500万行)を使うので、Worker の中で少しのあいだ覚えておく。
 */
async function numberEntries(db: DrizzleD1Database): Promise<IndexedNumber[]> {
    if (numberIndex && Date.now() - numberIndex.loadedAt < INDEX_TTL_MS) return numberIndex.entries;

    const rows = await db.select({ name: numbers.name }).from(numbers).orderBy(desc(numbers.date));

    numberIndex = {
        loadedAt: Date.now(),
        entries: rows.map((row) => ({ name: row.name, key: nameKey(row.name) })),
    };

    return numberIndex.entries;
}

/**
 * 号の名前のオートコンプリート。雑誌名と番号が合う号を、新しい号から返す(number-search.ts)。
 * 元のタイトル(name_raw)は探さない。
 */
export async function searchNumberNames(db: DrizzleD1Database, query: string): Promise<string[]> {
    const q = nameKey(query);

    return (await numberEntries(db))
        .filter((entry) => matches(q, entry.key))
        .sort((a, b) => tier(q, a.key) - tier(q, b.key))
        .slice(0, MAX_CHOICES)
        .map((entry) => entry.name);
}

/**
 * 入力された号の名前から、号を1つに決める。候補から選ばずに入力した場合(E×E 73 や 快楽天 2026 7)のため。
 * 番号が完全に合う号がちょうど1つあればそれ、なければ入力途中として前方一致する号がちょうど1つあればそれ。
 * 決まらなければ null。
 */
async function resolveNumberName(db: DrizzleD1Database, input: string): Promise<string | null> {
    const q = nameKey(input);

    if (!q.text && !q.nums.length) return null;

    const entries = await numberEntries(db);

    for (const exact of [true, false]) {
        const hits = entries.filter((entry) => matches(q, entry.key, exact));
        const best = hits.filter((entry) => tier(q, entry.key) === 0);
        const pool = best.length ? best : hits;
        // 限定版などの注記つき(【…】)の号と通常の号が並ぶときは、通常の号
        const plain = pool.filter((entry) => !entry.name.includes('【'));
        const chosen = plain.length === 1 ? plain : pool;

        if (chosen.length === 1) return chosen[0].name;
        // 複数あるのは、入力が足りない
        if (chosen.length > 1) return null;
    }

    return null;
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

// 1回の呼び出しで行うリクエスト数。無料プランは CPU 時間が10msまでなので、少なめにして呼び出しを分ける
const DEFAULT_MAX_REQUESTS = 6;

// D1 は1クエリあたりのバインド変数が100個まで
const MAX_PARAMS = 100;

class BudgetExhausted extends Error {}

// 途中のページから読み始めたが、最初の号が保存済みではなかった(一覧の並びが前にずれた)。最初から読み直す
class ResumeMissed extends Error {}

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
    // 号が並んでいた一覧のページ
    page: number;
    // 号の掲載作品(DLsite の並び = 号の中の並び)
    singles: ListItem[];
}

interface Progress {
    cursor: string | null;
    cursorPage: number | null;
    completed: boolean;
}

/**
 * 保存済みの号と作品。D1 は読み取った行数に上限があるので、
 * 全件ではなく、読んだページに並んでいた号の分だけを取る。
 */
class Known {
    // 号ID -> 販売日
    readonly numbers = new Map<string, Date>();
    // 作品ID -> 号の中の並び
    readonly works = new Map<string, number>();

    private checked = new Set<string>();

    constructor(private db: DrizzleD1Database) {}

    async load(numberIds: string[]): Promise<void> {
        const ids = numberIds.filter((id) => !this.checked.has(id));

        for (const part of chunks(ids, MAX_PARAMS)) {
            part.forEach((id) => this.checked.add(id));

            const saved = await this.db
                .select({ id: numbers.id, date: numbers.date })
                .from(numbers)
                .where(inArray(numbers.id, part));

            if (!saved.length) continue;

            saved.forEach((n) => this.numbers.set(n.id, n.date));

            const rows = await this.db
                .select({ id: works.id, position: works.position })
                .from(works)
                .where(
                    inArray(
                        works.numberId,
                        saved.map((n) => n.id)
                    )
                );

            rows.forEach((w) => this.works.set(w.id, w.position));
        }
    }
}

/**
 * DLsite のレーベルページから雑誌の号と掲載作品を取得して保存する。
 *
 * magazineId は DLsite のレーベルID(LBL00611 など)。
 * レーベルの一覧は古い順で、「雑誌 → 単話 … 単話」の並びになっている。
 * 雑誌から、次の雑誌の手前までの単話を、その号の掲載作品とする。
 * 古い順なら、新しい号は末尾に足されるだけで、すでに読んだ部分の並びは動かない。
 *
 * 差分は号と作品のIDで取る。
 * - 号が未保存: 号の詳細ページから販売日を取り、号と単話をまとめて保存する
 * - 号が保存済み: 未保存の単話(と並びが変わった単話)だけを保存する(詳細ページは取らない)
 * 単話には号の中での並び(position)を、号に近い(古い)ほうから 1, 2, 3... と振る。
 *
 * 進捗は magazines に持つ。
 * - cursorNumberId, cursorPage: ここまで保存した最後の号と、それが並んでいた一覧のページ。
 *   次はこのページの1ページ前から読む(号を追加したときの単話の取りこぼしを拾うため)
 * - completed: 一覧の末尾まで一度は読み終えた
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
    async run(magazineIds: string[]): Promise<RunResult> {
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

    /** 並びの末尾まで読み終えたら true。予算を使い切って途中で止まったら false */
    async fetchAndSaveWorksDiffFromMagazine(
        magazineId: string,
        maxRequests: number = this.maxRequests
    ): Promise<boolean> {
        const budget = new RequestBudget(maxRequests);

        const [magazine] = await this.db.select().from(magazines).where(eq(magazines.id, magazineId));

        const known = new Known(this.db);
        const pending: Pending = { numbers: [], authors: new Map(), works: [] };

        const progress: Progress = {
            cursor: magazine?.cursorNumberId ?? null,
            cursorPage: magazine?.cursorPage ?? null,
            completed: magazine?.completed ?? false,
        };
        // 1ページ戻って読む。直近の号に単話が追加されていないかの確認と、並びがずれたときの余裕を兼ねる
        const startPage = progress.cursorPage ? Math.max(1, progress.cursorPage - 1) : 1;

        let reachedEnd = false;
        let groups = 0;

        try {
            for await (const group of this.listGroups(magazineId, budget, startPage, known)) {
                groups++;

                if (startPage > 1 && groups === 1 && !known.numbers.has(group.issue.id)) {
                    // 前のページの号の【デジタル特装版】などが先頭に来ることがある。その号の続きなので飛ばす
                    if (isAnnotated(group.issue.name)) continue;

                    // 途中のページから読み始めた最初の号は、保存済みのはず。違えば並びがずれているので読み直す
                    throw new ResumeMissed();
                }

                const knownDate = known.numbers.get(group.issue.id);

                if (knownDate) {
                    this.collectWorks(group.issue.id, knownDate, group.singles, known.works, pending);
                } else {
                    // 失敗したら飛ばさずに止める(飛ばすと cursor が未保存の号を越えてしまう)
                    await this.collectIssue(magazineId, group, !magazine, pending, budget);
                }

                // 読み直しで、保存した位置より手前の号に戻らないようにする
                if (!progress.cursorPage || group.page >= progress.cursorPage) {
                    progress.cursor = group.issue.id;
                    progress.cursorPage = group.page;
                }
            }

            reachedEnd = true;
            progress.completed = true;

            if (!groups) {
                console.warn(`okazuri: ${magazineId}: no issues found. is the label id correct?`);
            }
        } catch (e) {
            if (e instanceof ResumeMissed) {
                progress.cursorPage = null;
                console.warn(
                    `okazuri: ${magazineId}: page ${startPage} does not match the cursor, will restart from page 1`
                );
            } else if (e instanceof BudgetExhausted) {
                console.warn(`okazuri: ${magazineId}: request budget exhausted, will continue next run`);
            } else {
                throw e;
            }
        } finally {
            await this.save(magazineId, magazine, pending, progress);

            console.log(
                `okazuri: ${magazineId}: +${pending.numbers.length} numbers, +${pending.works.length} works` +
                    ` (requests: ${budget.used}, cursor: ${progress.cursor}@${progress.cursorPage}, reached end: ${reachedEnd})`
            );
        }

        return reachedEnd;
    }

    /**
     * 一覧を「号と、その直後の単話」のまとまりに分ける。
     *
     * 同じ号の【デジタル特装版】などの別商品(号名が同じで【】の注記だけが違う)は、
     * 単話の途中に並ぶことがあるので、通常版にまとめる。
     * 途中のページから読み始めたときの、最初の号より前の単話は、どの号か分からないので捨てる。
     */
    private async *listGroups(
        magazineId: string,
        budget: RequestBudget,
        startPage: number,
        known: Known
    ): AsyncGenerator<Group> {
        let current: Group | null = null;

        for await (const { page, items } of this.listPages(magazineId, budget, startPage)) {
            // 保存済みかの判定は、まとまりを返す前に済ませる
            await known.load(items.filter((item) => item.type === 'magazine').map((item) => item.id));

            for (const item of items) {
                if (item.type === 'oneshot') {
                    current?.singles.push(item);
                    continue;
                }
                if (item.type !== 'magazine') continue;

                if (current && issueName(current.issue.name) === issueName(item.name)) {
                    // 同じ号の別商品。注記つきなら通常版を号にして、単話は同じ号にまとめる
                    if (!isAnnotated(item.name) && isAnnotated(current.issue.name)) {
                        current.issue = item;
                        current.page = page;
                    }
                    continue;
                }

                if (current) yield current;

                current = { issue: item, page, singles: [] };
            }
        }

        // 一覧の末尾の号。単話はあとから増えることがあるので、次回も読み直す
        if (current) yield current;
    }

    private async *listPages(
        magazineId: string,
        budget: RequestBudget,
        startPage: number
    ): AsyncGenerator<{ page: number; items: ListItem[] }> {
        for (let page = startPage; ; page++) {
            budget.take();

            let html: string;

            try {
                html = await fetchHtml(labelListUrl(magazineId, page));
            } catch (e) {
                // 件数が PER_PAGE の倍数のとき、末尾の次のページは存在しない
                if (page > startPage && e instanceof HttpError && e.status === 404) return;

                throw e;
            }

            const items = parseList(html);

            yield { page, items };

            if (items.length < PER_PAGE) return;
        }
    }

    private async collectIssue(
        magazineId: string,
        group: Group,
        needMagazine: boolean,
        pending: Pending,
        budget: RequestBudget
    ) {
        const { issue } = group;

        budget.take();

        const detail = parseDetail(await fetchHtml(productUrl(issue.id)));
        if (!detail) throw Error(`okazuri: release date not found: ${issue.id}`);

        if (needMagazine && !pending.magazineName) {
            pending.magazineName = detail.labelName ?? magazineId;
        }

        const { name, num } = normalizeIssueName(magazineId, issue.name);

        pending.numbers.push({
            id: issue.id,
            name,
            nameRaw: issue.name.trim(),
            num,
            date: detail.date,
            magazineId,
        });

        this.collectWorks(issue.id, detail.date, group.singles, new Map(), pending);
    }

    /**
     * group は号の掲載作品(DLsite の並び = 号に近い順)。
     * 先頭から 1, 2, 3... と並びを振り、未保存か並びが変わった作品だけを保存対象にする。
     */
    private collectWorks(
        numberId: string,
        date: Date,
        group: ListItem[],
        knownWorks: Map<string, number>,
        pending: Pending
    ) {
        group.forEach((work, i) => {
            const position = i + 1;

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
            magazine.cursorPage !== progress.cursorPage ||
            magazine.completed !== progress.completed;

        if (name && changed) {
            const state = {
                cursorNumberId: progress.cursor,
                cursorPage: progress.cursorPage,
                completed: progress.completed,
            };

            statements.push(
                this.db
                    .insert(magazines)
                    .values({ id: magazineId, name, ...state })
                    .onConflictDoUpdate({ target: magazines.id, set: state })
            );
        }

        for (const rows of chunks(pending.numbers, Math.floor(MAX_PARAMS / 6))) {
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

export interface DriveResult {
    /** 切り上げて、続きが残っているレーベルのID */
    pending: string[];
    /** 失敗したレーベルのID */
    failed: string[];
    /** run を呼んだ回数 */
    chunks: number;
}

/**
 * 取得を、別の呼び出し(run)に分けて、1レーベルずつ最後まで進める。
 *
 * Workers はリクエスト数(サブリクエスト)と CPU 時間の上限が呼び出しごとにあるので、
 * Fetcher は1回の呼び出しでは予算の分だけ進め、続きが残ったら RunResult.pending で知らせる。
 * 続きは新しい呼び出し(上限がリセットされる)で取る。run には自分自身への HTTP 呼び出しを渡す。
 *
 * maxChunks 回、または until(時刻、ミリ秒)を越えたら切り上げる。残りは pending で返すので、
 * 次の起爆で続きから取れる(進捗は Fetcher が DB に持っている)。
 */
export async function fetchMagazines(
    run: (magazineId: string) => Promise<RunResult>,
    magazineIds: string[],
    { maxChunks, until }: { maxChunks: number; until: number }
): Promise<DriveResult> {
    const result: DriveResult = { pending: [], failed: [], chunks: 0 };

    for (const [index, magazineId] of magazineIds.entries()) {
        for (;;) {
            if (result.chunks >= maxChunks || Date.now() >= until) {
                result.pending.push(...magazineIds.slice(index));

                console.warn(`okazuri: limit reached, will continue next time: ${result.pending.join(', ')}`);

                return result;
            }

            result.chunks++;

            try {
                const chunk = await run(magazineId);

                if (chunk.failed.length) result.failed.push(magazineId);
                if (chunk.failed.length || !chunk.pending.length) break;
            } catch (e) {
                console.error(`okazuri: failed to fetch ${magazineId}`, e);
                result.failed.push(magazineId);
                break;
            }
        }
    }

    return result;
}

// 【電子版限定特典付き】などの注記つきか
function isAnnotated(name: string): boolean {
    return issueName(name) !== name.trim();
}

function chunks<T>(rows: T[], size: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));

    return result;
}
