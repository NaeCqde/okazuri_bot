# Cloudflare 配下のサイトを取るときに分かったこと

okazuri-search-api で、Cloudflare 配下のサイトを取りに行くために調べたことの記録です。次の 2 種類に分けて書きます。

- **観測：** 自分で試して確かめた結果です。日付と条件が違えば、変わることがあります。
- **推測：** 観測から考えただけで、確かめていません。

**この書類の大きな限界。** 調べた側は、各サイトの Cloudflare の設定（カスタムルール、しきい値）を見られません。「サイトの設定による」と書いた分は、結果からの推測です。

## 1. 対象のサイト

- Cloudflare のプロキシを通っています。
- Under Attack モードは、オフです（twivideo.net を除く。3 章）。
- 素の HTTP クライアントで取りに行くと、403 が返ります。

## 2. 普通の説明：サイトごとの設定に関係なく見えた傾向

どのサイトでも、似た傾向が見えたものです。ただし、通る・通らないのしきい値は、サイトの設定しだいかもしれません（3 章）。

### 2.1 結果に効いたもの（観測）

同じ条件なら、毎回同じ結果でした。

| 要素 | 観測 |
|---|---|
| TLS の ClientHello（暗号スイート、拡張、ALPN） | 効きます。同じ OS でも、クライアントごとに結果が違います（2.3）。 |
| HTTP のバージョン | クライアントごとに、通るほうが違います（2.3）。 |
| 送信元の IP | 同じクライアントでも、Mac では 403、Linux のサーバーでは 200 になる例があります（2.4）。 |
| リクエストのヘッダー（`Accept`、`Sec-CH-UA`、`Sec-Fetch-*`） | 1 つずつの効果は、切り分けていません。念のため付けています。 |

### 2.2 効かなかったもの（観測、NukiBooks）

- **暗号スイートの数や並び。** curl は減らすと通りましたが、wreq（指紋なし）は 4〜28 個のどれでも通りませんでした。
- **TLS セッション再開。** 毎回完全なハンドシェイクをしても、reqwest は 10 回続けて 200 でした。

### 2.3 クライアントごとの結果（観測、HTTP/2 を既定とする）

NukiBooks を、Mac から取った結果です。「HTTP/2 にすれば通る」とは言えません。

| クライアント | 結果 |
|---|---|
| Rust reqwest（rustls）、HTTP/2 | 200。HTTP/1.1 では全サイトが 403 でした。 |
| macOS 標準の curl（SecureTransport）、既定の HTTP/2 | 403（暗号スイート 49 個） |
| 同、HTTP/1.1 | 200 |
| 同、`--ciphers` で暗号スイートを 1 種類以上に絞る | 200 |
| Go（net/http） | 暗号スイート 3〜25 個で 200 |
| Rust wreq（BoringSSL、指紋なし） | 403 |
| wreq + Chrome / Firefox / Safari の指紋 | 200 |
| Node の `fetch`（undici） | 403（暗号スイート 4〜52 個すべて） |

まず手元のクライアントで、HTTP/2 と HTTP/1.1 の両方を試してください。

**推測：** 送られる ClientHello は、curl の HTTP/2 と HTTP/1.1 で ALPN だけが違います（JA4 の `h2` と `h1`）。暗号スイートを変えると、JA4 の中ほどのハッシュも変わります。「JA4 の指紋ごとに、Cloudflare が評価している」と考えると、結果が説明できます。

### 2.4 Linux サーバーでの結果（観測、NukiBooks、HTTP/2）

データセンターの Linux サーバー 3 台から取りました。1 台につき、Referer あり・なしで、2 回ずつです。

| クライアント | 結果（3 台とも） |
|---|---|
| reqwest（rustls、既定） | 200 |
| wreq（指紋なし） | 200 |
| wreq + Chrome 147 の指紋 | 200 |
| wreq + Safari 18.5 の指紋 | 200 |

- Mac では 403 だった wreq（指紋なし）が、Linux サーバーでは 200 でした。指紋だけでなく、IP や回線の違いも効いています。
- 1 台（vultr）では、Debian の curl（OpenSSL）は 403 でした。ヘッダー、HTTP のバージョン、暗号スイートを変えても、通りませんでした。同じ台で reqwest と wreq は 200 でした。
- 推測：IP ごとの評判が、あるとみられます。

## 3. サイトごとの設定が要因とみられるもの

次は、1 つのサイトで見えた、ほかと違う振る舞いです。サイトの設定（カスタムルールなど）によるとみていますが、設定は見えないので、**推測**です。

| サイト | 観測 | 推測される要因 |
|---|---|---|
| HentaiName | ブラウザの User-Agent のときだけチャレンジが出ます。素の User-Agent（`okazuri-search-api/1.0`）と簡単な `Accept` だけなら、通ります。 | User-Agent を見るルール |
| abuseipdb.com | Google の `Referer` を付けると、403 が 200 に変わりました。IPv4 と IPv6、Safari と Chrome の User-Agent のどれでも同じでした。curl の既定の User-Agent では、`Referer` があっても 403 でした。 | Referer を見るルール |
| HentaiOMG、HentaiCore | 操作が要るチャレンジ（Turnstile）が出ます。突破しないので、対象から外しています。 | サイトの設定 |
| IMHentai、NukiBooks（一部の条件） | チャレンジの画面が返る条件があります（5.1 の表）。 | クライアントの指紋とサイトの設定の組み合わせ |
| twivideo.net | 過去に Under Attack がオフの時期があり、最近オンになったとのことです。本番の Workers では、通っていませんでした（6 章）。 | サイトの設定（Under Attack） |

- 2 章の NukiBooks の結果が、NukiBooks 自身の設定によるものか、Cloudflare の共通の判定によるものかは、切り分けていません。ほかのサイトで、同じ結果になるとは限りません。
- 通らないサイトでは、ブラウザの User-Agent と素の User-Agent、HTTP/2 と HTTP/1.1 を、それぞれ試してください。

## 4. reqwest のサンプルコード

`Cargo.toml`:

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "http2", "gzip", "brotli"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

- 機能 `http2` を有効にするだけで、rustls は ALPN で `h2,http/1.1` を出します。
- **ALPN は、手で設定しないでください。** `http2` 機能が無効のとき、手で `h2` を設定すると、実行時にパニックします。
- `http1_only()` は呼びません。

`main.rs`（実際に動かして、HTTP/2 と 200 を確認しました）:

```rust
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, UPGRADE_INSECURE_REQUESTS, USER_AGENT};

/// Chrome 風のクライアント。`http2` 機能が有効なので、ALPN で HTTP/2 になる。
fn browser_client() -> reqwest::Result<reqwest::Client> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"));
    headers.insert(ACCEPT, HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("ja,en;q=0.8"));
    headers.insert(UPGRADE_INSECURE_REQUESTS, HeaderValue::from_static("1"));
    for (name, value) in [
        ("sec-ch-ua", "\"Chromium\";v=\"126\", \"Not.A/Brand\";v=\"24\", \"Google Chrome\";v=\"126\""),
        ("sec-ch-ua-mobile", "?0"),
        ("sec-ch-ua-platform", "\"Windows\""),
        ("sec-fetch-dest", "document"),
        ("sec-fetch-mode", "navigate"),
        ("sec-fetch-site", "none"),
        ("sec-fetch-user", "?1"),
    ] {
        headers.insert(HeaderName::from_static(name), HeaderValue::from_static(value));
    }
    reqwest::Client::builder().default_headers(headers).build()
}

/// ブラウザの User-Agent にだけチャレンジを出すサイト（HentaiName）用: 素の User-Agent と簡単な Accept だけ。
fn plain_client() -> reqwest::Result<reqwest::Client> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("text/html,*/*;q=0.8"));
    reqwest::Client::builder().user_agent("okazuri-search-api/1.0").default_headers(headers).build()
}

#[tokio::main]
async fn main() -> reqwest::Result<()> {
    for (client, url) in [(browser_client()?, "https://nukibooks.com/?s=a"), (plain_client()?, "https://www.hentai.name/search/a/")] {
        let response = client.get(url).send().await?;
        println!("{url} -> {} {:?}", response.status(), response.version());
    }
    Ok(())
}
```

出力は、次のとおりでした。

```
https://nukibooks.com/?s=a -> 200 OK HTTP/2.0
https://www.hentai.name/search/a/ -> 200 OK HTTP/2.0
```

## 5. Cloudflare Workers で試した結果

### 5.1 `fetch()` で、Cloudflare 配下のサイトを取る（観測）

`wrangler dev --remote` の `fetch` で、各サイトを 2 回ずつ取りました。

| サイト | 既定の User-Agent | ブラウザ風ヘッダー |
|---|---|---|
| HentaiName | 200 | 403（チャレンジ） |
| IMHentai | 403（チャレンジ） | 403（チャレンジ） |
| NijiGazo | 403 | 403 |
| NukiBooks | 403 | 403（チャレンジ） |
| HentaiPaw | 403 | 403 |

- 通るのは、HentaiName（既定の User-Agent）だけでした。HentaiName は、3 章のとおり、User-Agent で結果が変わるサイトです。ほかの 4 サイトは、再試行しても 403 でした。
- 当初「HentaiName は Workers では動かなかった」とされていましたが、これは誤りでした。サイトは Under Attack モードではありませんでした。

同じ Worker を、`wrangler dev --local`（手元の Mac で動かす）でも試しました（NukiBooks だけ、3 回ずつ）。

| 条件 | 結果 |
|---|---|
| 既定の User-Agent | 403、3 回とも（「Attention Required! \| Cloudflare」） |
| ブラウザ風ヘッダー | 200、3 回とも（本物のページ） |

- 同じヘッダーで、`--remote`（Cloudflare 上）は 403、`--local`（Mac から出る）は 200 でした。
- 5.1 の `--remote` の結果は、Workers が本番で動くときの結果に近いものです。`--local` の 200 は、Mac の IP と、手元のランタイムの結果です。
- IP と TLS の指紋のどちらが効いたかは、切り分けていません。

### 5.2 Workers の `connect()` で、SOCKS5 を話した実験（観測）

Workers の `fetch` にはプロキシの設定がないので、`connect()`（`cloudflare:sockets`）で、自分で SOCKS5 を話しました。経由先は、contabo 上のプロキシです。

- **SOCKS5 の手順は、通りました。** 順番は、あいさつ（`05 01 02`）、認証（RFC 1929）、接続の依頼（`05 01 00 03` + ホスト名の長さ + ホスト名 + ポート）です。
- **そのあと `startTls()` で TLS を始めると、Cloudflare 配下のサイトとは、つながりませんでした。** プロキシ側で ClientHello を記録したところ、SNI が入っていませんでした。`expectedServerHostname` を渡しても、入りませんでした。Cloudflare 配下のサイトは、`handshake_failure` で閉じました。SNI がなくても答えるサイトは、通りました。
- **`startTls()` の仕様は、確かめていません。** SNI が入らなかった理由（接続先に IP を渡したためか、`startTls()` の仕様か）は、分かっていません。`startTls()` が、どこからどこまでを暗号化するかも、公式の資料の原文で確かめていません。上の結果は、この実験の範囲だけのものです。
- **経由先のサーバーで TLS を行う形では、動きました。** Worker が平文の HTTP をサーバーに送り、サーバーが目的地へ TLS で取りに行きます。NukiBooks では 403 でした。理由は、推測です（そのサーバーの Python（OpenSSL）の指紋が、止められたとみられます）。
- **Workers の送信元の IP は、公開されている Cloudflare の範囲（`ips-v4`）の外でした**（104.28.x.x が見えました）。そのため、経由先の許可を、Cloudflare の範囲で絞る方法は使えませんでした。経由先には、認証をかけました。

## 6. 過去の記録：twivideo.net が通ったように見えた件（ローカルだけの結果だった）

別のプロジェクト（heros）が、Cloudflare Workers で twivideo.net を取っていて、通っていると考えられていました。2026-11-27 に、本番の heros を確かめたところ、**Cloudflare のプロキシを突破できていませんでした**。成功に見えたのは、手元で動かしている間だけでした。

- **出どころ。** Windows ノートの Claude の記録（2026-10-28 の 04:10〜05:05）です。手元の Node（`node:https`）と本物の curl で試した結果で、Workers で試したものではありません。記録には「Workers の fetch がどう扱われるかは、ここからは分かりません」と書かれています。私たちは、この記録を再現していません。
- **記録の内容。** 毎回完全なハンドシェイクをすると、6 回中 6 回が 403 でした。セッションを再利用できる状態（同じプロセスの 2 回目以降）は、ほぼ 200 でした。`Referer` や `Origin` を足しても、変わりませんでした。この結果と、「TLS セッション再開」という説明は、手元の Node と curl のものです。説明は、のちに私たち（Claude）が付けた解釈で、確かめていません。
- **今の理解。** 手元（`--local`、または手元の Node と curl）で通り、本番の Workers で通らない、という違いがありました。5.1 の `--local` と `--remote` の差と、同じ形です。
- **この章の方法は、使えません。** 本番の Workers では通りませんでした。

## 7. 結果の古さ

この書類の結果は、2026-11 のものです。Cloudflare 側の設定や判定が変わると、結果も変わります。
