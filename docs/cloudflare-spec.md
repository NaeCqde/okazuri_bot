# Cloudflare 仕様まとめ：ボット判定と Workers

okazuri-search-api で、Cloudflare 配下のサイトを取りに行くために調べたことの記録です。次の 3 種類に分けて書きます。

- **観測：** 自分で試して確かめた結果です。日付と条件が違えば、変わることがあります。
- **公式：** Cloudflare の資料に書いてある仕様です。数字は変わるので、使う前に資料を見直してください。
- **推測：** 観測から考えただけで、確かめていません。

## 1. 対象のサイト

調べたのは、次の条件のサイトです。

- Cloudflare のプロキシを通っています。
- Under Attack モードは、オフです。
- 全ページを止める強制チャレンジ（Turnstile など）のルールは、ありません。

それでも、素の HTTP クライアントで取りに行くと、403 が返ります。

## 2. ボット判定について分かったこと

### 2.1 判定に効くもの（観測）

通るかどうかは、次の組み合わせで決まります。同じ条件なら、毎回同じ結果でした。

| 要素 | 観測 |
|---|---|
| TLS の ClientHello（暗号スイート、拡張、ALPN） | 決め手になります。同じ OS でも、クライアントごとに結果が違います。 |
| HTTP のバージョン | クライアントごとに、通るほうが違います（2.2 の表）。 |
| 送信元の IP | 同じクライアントでも、Mac では 403、Linux のサーバーでは 200 になる例があります。 |
| `Referer` | 検索エンジン（Google）の Referer を付けると、通るサイトがあります。 |
| `User-Agent` | サイトによっては、ブラウザの User-Agent にだけチャレンジを出します。 |
| リクエストのヘッダー（`Accept`、`Sec-CH-UA`、`Sec-Fetch-*`） | 1 つずつの効果は、切り分けていません。念のため付けています。 |

### 2.2 効かなかったもの（観測）

- **暗号スイートの数や並び。** curl は減らすと通りましたが、wreq は 4〜28 個のどれでも通りませんでした。
- **TLS セッション再開。** 毎回完全なハンドシェイクをしても、reqwest は 10 回続けて 200 でした。
- **`Referer` や `Origin` の追加**（あるサイトでは）。変わりませんでした。

### 2.3 「HTTP/2 にすれば通る」とは言えない（観測）

| クライアント | 結果 |
|---|---|
| Rust reqwest（rustls）、HTTP/2 | 200。HTTP/1.1 では全サイトが 403 でした。 |
| macOS 標準の curl（SecureTransport）、既定の HTTP/2 | 403（暗号スイート 49 個） |
| 同、HTTP/1.1 | 200 |
| 同、`--ciphers` で暗号スイートを 1 種類以上に絞る | 200 |
| Go（net/http） | 暗号スイート 3〜25 個で 200 |
| Rust wreq（BoringSSL、指紋なし） | 403（Mac） |
| wreq + Chrome / Firefox / Safari の指紋 | 200 |
| Node の `fetch`（undici） | 403（暗号スイート 4〜52 個すべて） |

まず手元のクライアントで、HTTP/2 と HTTP/1.1 の両方を試してください。

**推測：** 送られる ClientHello は、curl の HTTP/2 と HTTP/1.1 で ALPN だけが違います（JA4 の `h2` と `h1`）。暗号スイートを変えると、JA4 の中ほどのハッシュも変わります。「JA4 の指紋ごとに、Cloudflare が評価している」と考えると、結果が説明できます。

### 2.4 Linux サーバーでの結果（観測、HTTP/2）

データセンターの Linux サーバー 3 台から、NukiBooks を取りました。

| クライアント | 結果（3 台とも） |
|---|---|
| reqwest（rustls、既定） | 200 |
| wreq（指紋なし、Chrome 147、Safari 18.5） | 200 |

- Mac では 403 だった wreq（指紋なし）が、Linux サーバーでは 200 でした。指紋だけでなく、IP や回線の違いも効いています。
- 1 台（vultr）では、Debian の curl（OpenSSL）は 403 でした。ヘッダー、HTTP のバージョン、暗号スイートを変えても、通りませんでした。同じ台で reqwest と wreq は 200 でした。
- 経路上の IP の評価（IP ごとの評判）が、あるとみられます。

### 2.5 `Referer`（観測）

あるサイトでは、Google の `Referer` を付けると、403 が 200 に変わりました。IPv4 と IPv6、Safari と Chrome の User-Agent のどれでも同じでした。curl の既定の User-Agent では、`Referer` があっても 403 でした。

### 2.6 ブラウザの User-Agent にだけチャレンジを出すサイト（観測）

HentaiName は、ブラウザの User-Agent のときだけチャレンジを出します。素の User-Agent（例：`okazuri-search-api/1.0`）で、簡単な `Accept` だけを付けて取ると、通ります。通らないサイトでは、両方の User-Agent を試してください。

### 2.7 チャレンジが出るサイトの扱い

- Turnstile のような、操作が要るチャレンジは、突破しません。HentaiOMG と HentaiCore は、これに当たるので、対象から外しています。
- チャレンジが出るのは、サイトの設定しだいです。ブラウザでクッキーを消しても、出ないサイトもありました。ブラウザで出ないことは、クライアントでも出ない保証にはなりません。

## 3. reqwest のサンプルコード

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

## 4. Cloudflare Workers でできること

### 4.1 外へ出す通信（公式）

| 手段 | できること |
|---|---|
| `fetch()` | HTTP(S) で取りに行く。プロキシの設定はない。TLS の指紋は、Workers のランタイムが決める（変えられない）。 |
| `connect()`（`cloudflare:sockets`） | 生の TCP ソケット。`secureTransport: 'starttls'` で作れば、あとで `startTls()` により TLS に上げられる。 |
| WebSocket | `fetch()` の `Upgrade` で、クライアントとしてつなげる。 |

`connect()` の決まり：

- `startTls()` を使うなら、`connect()` を呼ぶときに `secureTransport: 'starttls'` を指定する必要があります。あとから変えられません。
- ソケットは、グローバルスコープで作れません。`fetch()`、`scheduled()`、`queue()`、`alarm()` などのハンドラーの中で作ります。
- **Cloudflare の IP の範囲への、外向きの TCP ソケットは、禁止されています。** Cloudflare 配下のサイトへは、`connect()` で直接つなげません（`fetch()` を使います）。

### 4.2 実行の制限（公式、2026-11 に検索で確認。使う前に資料を見てください）

| 項目 | 値 |
|---|---|
| CPU 時間 | Free は 10 ms。有料は最大 5 分（既定 30 秒）。`fetch()` などの待ち時間は数えない。超えると Error 1102。 |
| メモリ | 1 つの isolate で 128 MB |
| サブリクエスト（1 回の呼び出しあたり） | Free は外部 50 件。有料は設定できる（資料で数字が食い違っていた） |
| バンドルの大きさ | Free は 3 MB、有料は 10 MB |
| リクエストのボディ | 100 MB（Free と Pro）、200 MB（Business） |
| ヘッダー、URL | リクエストのヘッダー 128 KB、レスポンスのヘッダー 128 KB、URL 16 KB |
| レスポンスのボディ | 上限なし |

出典：[Workers の制限](https://developers.cloudflare.com/workers/platform/limits/)、[サブリクエストの変更履歴](https://developers.cloudflare.com/changelog/2026-02-11-subrequests-limit)、[TCP ソケット](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)。

### 4.3 Workers が持つ機能（公式、一般的な知識。このプロジェクトでは、使っていないものを含む）

- **トリガー：** HTTP リクエスト（`fetch`）、Cron（`scheduled`）、キュー（`queue`）、メール、Durable Object のアラーム（`alarm`）。
- **保存：** KV（結果整合のキーと値）、R2（オブジェクトストレージ）、D1（SQLite）、Durable Objects（1 つの ID に 1 つの実体で、状態を持つ）、Cache API。
- **静的ファイル：** Workers Assets で、Worker と一緒に配信する（このサイトの `site/` がこれ）。
- **デプロイ：** `wrangler deploy`。このプロジェクトでは、Workers Builds が失敗するので、手元から `npx wrangler deploy` で行っています。
- **開発：** `wrangler dev` はローカル実行。`--remote` は、Cloudflare の上で実行する（下の 5 章の実験は、これで行った）。

## 5. Workers で試した結果（観測）

### 5.1 `fetch()` で、Cloudflare 配下のサイトを取る

`wrangler dev --remote` の `fetch` で、各サイトを 2 回ずつ取りました。

| サイト | 既定の User-Agent | ブラウザ風ヘッダー |
|---|---|---|
| HentaiName | 200 | 403（チャレンジ） |
| IMHentai | 403（チャレンジ） | 403（チャレンジ） |
| NijiGazo | 403 | 403 |
| NukiBooks | 403 | 403（チャレンジ） |
| HentaiPaw | 403 | 403 |

- 通るのは、HentaiName（既定の User-Agent）だけでした。ほかの 4 サイトは、再試行しても 403 でした。
- 当初「HentaiName は Workers では動かなかった」とされていましたが、これは誤りでした。サイトは Under Attack モードではありませんでした。
- Workers の `fetch` の TLS の指紋は変えられないので、通らないサイトは、ほかの手を探すことになります（Workers から別のサーバーを経由する手は、5.2）。

### 5.2 Workers から、別のサーバーを経由する

Workers の `fetch` にはプロキシの設定がありません。`connect()` で、自分で SOCKS5 を話せます。

- **SOCKS5 の手順は、通ります。** 順番は、あいさつ（`05 01 02`、認証方式は「ユーザー名とパスワード」）、認証（RFC 1929）、接続の依頼（`05 01 00 03` + ホスト名の長さ + ホスト名 + ポート）です。そのあと `startTls()` で TLS を始めます。
- **`startTls()` が暗号化するのは、Worker と目的のサイトの間です。** Worker と経由先のサーバーの間は、暗号化されません。HTTP の CONNECT プロキシでも同じで、HTTPS のサイトとの TLS は、クライアント（ここでは Worker）が行います。経由先は、中身を見られません（TLS を自分で終わらせる、中間者型のプロキシは別です）。
- **ただし、Cloudflare 配下のサイトには、HTTPS でつなげませんでした。** `startTls()` が送る ClientHello に、SNI が入っていません（`expectedServerHostname` を渡しても、入りませんでした）。Cloudflare 配下のサイトは、`handshake_failure` で閉じます。SNI がなくても答えるサイトは、通ります。SNI が入らない原因は、推測です（IP でつなぐと、SNI が付かないのかもしれません）。
- **経由先のサーバーで TLS を行う形なら、動きます。** Worker が平文の HTTP をサーバーに送り、サーバーが目的地へ TLS で取りに行きます。NukiBooks では 403 でした（そのサーバーの Python（OpenSSL）の指紋が、止められたとみられます）。
- **Workers の送信元の IP は、公開されている Cloudflare の範囲（`ips-v4`）の外でした**（104.28.x.x が見えました）。送信元の IP で許可する使い方は、できません。経由先には、認証が必要です。

## 6. 過去の記録：Workers で、別のサイトを取っていた方法（現在は再現できていません）

過去に、別の Cloudflare Workers のプロジェクトが、twivideo.net を取っていました。当時、このサイトは Under Attack モードがオフでした（最近、オンになりました）。

注意：この章は、過去の記録です。このサイトは今は Under Attack がオンで、今の Workers では確かめられません。5.1 の今の結果と合わないので、この章の方法をそのまま使わないでください。

- **クライアント。** Workers の標準 `fetch` だけです。TLS の細工も、プロキシも、クッキー取得の仕組みもありません。
- **ヘッダー。** Edge/Chrome 134 風の一式でした。`Accept`、`Accept-Language: ja`、`Accept-Encoding: gzip, deflate, br, zstd`、`Sec-Ch-Ua*` 一式、`Sec-Fetch-Dest/Mode/Site/User` です。
- **再試行。** 初回だけ 403 が返ることがあるので、失敗したら 1 回だけやり直していました。
- **TLS セッション再開の仮説（Workers の外での調査）。** Node と curl で調べたところ、毎回完全なハンドシェイクをすると、6 回中 6 回が 403 でした。セッション再開ができる 2 回目以降は、ほぼ 200 でした。Workers のランタイムが同じことをしているかは、未確認です。
- **この仮説は、NukiBooks では成り立ちません**（2.2 の「TLS セッション再開」）。サイトごとに違います。

## 7. まだ確かめていないこと

- Workers の `connect()` が、SNI を送らない原因（`connect({hostname})` に、ホスト名ではなく IP を渡したためか）。
- Workers の `fetch` の ClientHello の中身（JA4）。
- 有料の Workers で、サブリクエストの上限が、実際にいくつか。
- 2 章の結果は、2026-11 のものです。Cloudflare 側の設定や判定が変わると、結果も変わります。
