# okazuri_bot 仕様

DLsite のおかずり(LBL レーベル)雑誌の掲載作品を検索する Discord ボット。Cloudflare Workers(Hono + discord-hono + Drizzle/D1)。
仕様を変えたときは、このファイルも必ず更新する。

## 構成

| 場所 | 役割 |
|---|---|
| `src/index.ts` | Hono。`/interaction` に discord-hono、`scheduled` で雑誌の取得を起動 |
| `src/endpoints.ts` | HTTP エンドポイント(`/internal/fetch-magazines`、検索) |
| `src/cmd/` | スラッシュコマンド・コンテキストメニュー・コンポーネント |
| `src/cmd_handler.ts` | 検索の実行と返信(`searchHandler`) |
| `src/search/` | 検索クライアント(おかずり検索 API、Google、Bing) |
| `src/magazines.ts` | D1 の雑誌・号・作品の検索、DLsite からの取得(`Fetcher`、`fetchMagazines`) |
| `src/dlsite.ts`, `src/html.ts` | DLsite の HTML 取得・解析 |
| `src/issue-name.ts`, `src/number-search.ts` | 号の名前の正規化と検索用キー |
| `src/schema.ts` | D1 のテーブル |

## 設定

`wrangler.jsonc`: Worker 名 `okazuri-bot`、cron `0 0 * * *`(毎日)、配置 `aws:ap-northeast-1`、ルート `okazuri-api.nae.quest/interaction*` と `/internal/*`、D1 は `DB`(okazuri)。
`vars`: `WORKER_URL`、`MAGAZINE_IDS`(対象の LBL id、11件)。

シークレット(`example.dev.vars`): `APPLICATION_ID`, `PUBLIC_KEY`, `BOT_TOKEN`, `OKAZURI_API_URL`(既定 `https://okazuri-api.nae.quest`), `ERROR_LOG_WEBHOOK`, `CRON_SECRET`。コミットしない。

## テーブル(D1)

- `magazines`: id, name, cursorNumberId, cursorPage, completed(取得の進み具合)
- `numbers`: id, name, nameRaw, num, date, magazineId(雑誌の号)
- `authors`: 作者
- `works`: id, name, date, position, numberId, authorId(号に載った作品)

## Discord コマンド

- `/search`: 作品名などを検索する。`to_magazine` を付けると、入力した作品が載った号の名前に直して検索する。
- `/works`: 雑誌の号・作品名のオートコンプリート付きで掲載作品を一覧する(`listWorks`、`searchNumberNames`)。
- コンテキストメニュー「これらを検索」(`search_this`、設定付きは `search_this_option`):メッセージ中の URL からタイトルを取り(`titleByUrl`、非対応サイトや失敗は除く)、検索する。
- `from_work`: 作品名から雑誌を探す。

検索結果は `searchMultiple` で複数クエリを順に検索し、`resultToText` で整形、`splitText` で 2000 文字ごとに分けて返信する。
号が見つからない(`NotFoundError`)ときは利用者向けの案内のみ。それ以外の失敗は汎用メッセージを返し、`ERROR_LOG_WEBHOOK` にエラーを通知する。

## 検索

- おかずり検索 API: `GET {OKAZURI_API_URL}/okazuri/search?q=…&live=diff`。
- `GET /:engine/search`、`GET /:engine/images/search`: engine は `google` か `bing`。`q` は 1〜150 文字、`start` は 0 以上(任意)。

## 雑誌の取得 `POST /internal/fetch-magazines`

- `Authorization: Bearer ${CRON_SECRET}` を定数時間比較(`safeEqual`)で検査。一致しなければ 404。
- `labelIds` は最大 50 件、各 `^LBL\d+$` に一致すること。
- 親モードが子のチャンクを順に呼ぶ。`MAX_CHUNKS` 40、`DRIVE_MS` 60 秒。
- `scheduled`(毎日)は `triggerFetchMagazines(env)` で起動する。
- 1 回のリクエスト数に上限がある(`DEFAULT_MAX_REQUESTS` 6、SQL パラメータは `MAX_PARAMS` 100 以下)。

## セキュリティ上の注意

- Discord の `/interaction` は `PUBLIC_KEY` による署名検証に頼る。
- `/internal/*` は `CRON_SECRET` が唯一の防御。
- 検索エンドポイントは認証なしだが、`q` の長さと engine を検査する。
- 外部サイトの HTML を解析するので、結果は必ず長さ・形式を検査して使う。
- トークン・Webhook URL をコードやログに含めない。
