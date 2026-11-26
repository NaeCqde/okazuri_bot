# Cloudflare 配下のサイトの取得結果

- 観測：試して確かめた結果
- 推測：確かめていない説明
- 測定は 2026-11。Cloudflare 側の設定や判定が変わると、結果も変わる
- 各サイトの Cloudflare の設定（カスタムルール、しきい値）は見えない。「サイトの設定」は推測

## 1. 対象

- Cloudflare のプロキシ経由
- Under Attack モードはオフ（HentaiOMG、HentaiCore、twivideo.net を除く。3 章）
- 素の HTTP クライアントで取ると 403

## 2. 全般の傾向

どのサイトでも似た傾向。通る・通らないのしきい値は、サイトの設定しだいの可能性あり（3 章）。

### 2.1 結果に効く要素（観測）

- TLS の ClientHello（暗号スイート、拡張、ALPN）：効く。同じ OS でも、クライアントごとに結果が違う（2.3）
- HTTP のバージョン：クライアントごとに、通る側が違う（2.3）
- 送信元の IP：同じクライアントで、Mac は 403、Linux のサーバーは 200 の例あり（2.4）
- リクエストのヘッダー（`Accept`、`Sec-CH-UA`、`Sec-Fetch-*`）：1 つずつの効果は未切り分け。念のため付けている
- 同じ条件なら、毎回同じ結果

### 2.2 効かなかったもの（観測、NukiBooks）

- 暗号スイートの数や並び：curl は減らすと通る。wreq（指紋なし）は 4〜28 個のどれでも通らない
- TLS セッション再開：毎回完全なハンドシェイクでも、reqwest は 10 回続けて 200

### 2.3 クライアント別の結果（観測、NukiBooks、Mac、HTTP/2 が既定）

| クライアント | 結果 |
|---|---|
| Rust reqwest（rustls）、HTTP/2 | 200（HTTP/1.1 は全サイトで 403） |
| macOS 標準の curl（SecureTransport）、既定の HTTP/2 | 403（暗号スイート 49 個） |
| 同、HTTP/1.1 | 200 |
| 同、`--ciphers` で 1 種類以上に絞る | 200 |
| Go（net/http） | 暗号スイート 3〜25 個で 200 |
| Rust wreq（BoringSSL、指紋なし） | 403 |
| wreq + Chrome / Firefox / Safari の指紋 | 200 |
| Node の `fetch`（undici） | 403（暗号スイート 4〜52 個すべて） |

- 「HTTP/2 にすれば通る」とは言えない
- 手元のクライアントで、HTTP/2 と HTTP/1.1 の両方を試す
- 推測：curl の HTTP/2 と HTTP/1.1 は、ClientHello の ALPN だけが違う（JA4 の `h2` と `h1`）。暗号スイートを変えると、JA4 の中ほどのハッシュも変わる。「JA4 の指紋ごとに評価している」と考えると説明がつく

### 2.4 Linux サーバーでの結果（観測、NukiBooks、HTTP/2）

3 台のデータセンターの Linux サーバー。1 台につき、Referer あり・なしで 2 回ずつ。

| クライアント | 結果（3 台とも） |
|---|---|
| reqwest（rustls、既定） | 200 |
| wreq（指紋なし） | 200 |
| wreq + Chrome 147 の指紋 | 200 |
| wreq + Safari 18.5 の指紋 | 200 |

- Mac で 403 の wreq（指紋なし）が、Linux サーバーでは 200。指紋だけでなく、IP や回線も効く
- vultr：Debian の curl（OpenSSL）は 403。ヘッダー、HTTP のバージョン、暗号スイートを変えても通らない。同じ台で reqwest と wreq は 200
- 推測：IP ごとの評判がある

## 3. サイトごとの設定が要因とみられるもの（推測）

1 つのサイトだけで見えた、ほかと違う振る舞い。

| サイト | 観測 | 推測される要因 |
|---|---|---|
| HentaiName | ブラウザの User-Agent のときだけチャレンジ。素の User-Agent（`okazuri-search-api/1.0`）と簡単な `Accept` だけなら通る | カスタムルールの穴（素の User-Agent は、ルールの対象外になっている） |
| abuseipdb.com | Google の `Referer` で 403 が 200 に変わる。IPv4・IPv6、Safari・Chrome の User-Agent のどれでも同じ。curl の既定の User-Agent では、`Referer` があっても 403 | カスタムルールの穴（検索エンジンの Referer は、ルールの対象外になっている） |
| HentaiOMG、HentaiCore、twivideo.net | 3 サイトとも Under Attack がオン。HentaiOMG と HentaiCore は、操作が要るチャレンジ（Turnstile）が出るので、突破せず対象から外している | サイトの設定（Under Attack） |
| IMHentai、NukiBooks（一部の条件） | チャレンジの画面が返る条件がある（5.1） | クライアントの指紋とサイトの設定の組み合わせ |

- 2 章の NukiBooks の結果が、NukiBooks 自身の設定か、Cloudflare 共通の判定かは、切り分けていない
- ほかのサイトで、同じ結果になるとは限らない
- 通らないサイトでは、ブラウザの User-Agent と素の User-Agent、HTTP/2 と HTTP/1.1 を、それぞれ試す

## 4. reqwest のサンプルコード

`Cargo.toml`:

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "http2", "gzip", "brotli"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

- 機能 `http2` を有効にするだけで、rustls は ALPN で `h2,http/1.1` を出す
- ALPN は手で設定しない。`http2` 機能が無効のときに手で `h2` を設定すると、実行時にパニックする
- `http1_only()` は呼ばない

`main.rs`（実行して、HTTP/2 と 200 を確認）:

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

出力:

```
https://nukibooks.com/?s=a -> 200 OK HTTP/2.0
https://www.hentai.name/search/a/ -> 200 OK HTTP/2.0
```

## 5. Cloudflare Workers の実験

### 5.1 `wrangler dev --remote` の `fetch()`（観測、各サイト 2 回ずつ）

| サイト | 既定の User-Agent | ブラウザ風ヘッダー |
|---|---|---|
| HentaiName | 200 | 403（チャレンジ） |
| IMHentai | 403（チャレンジ） | 403（チャレンジ） |
| NijiGazo | 403 | 403 |
| NukiBooks | 403 | 403（チャレンジ） |
| HentaiPaw | 403 | 403 |

- 通ったのは HentaiName（既定の User-Agent）だけ（3 章）
- ほかの 4 サイトは、再試行しても 403

### 5.2 `wrangler dev --local` の `fetch()`（観測、NukiBooks、3 回ずつ）

| 条件 | 結果 |
|---|---|
| 既定の User-Agent | 403（「Attention Required! \| Cloudflare」） |
| ブラウザ風ヘッダー | 200（本物のページ） |

- 同じヘッダーで、`--remote` は 403、`--local` は 200
- IP（`--local` は Mac から出る）と TLS の指紋のどちらが効いたかは、未切り分け

### 5.3 `connect()` で SOCKS5（観測、経由先は contabo のプロキシ）

- Workers の `fetch` にはプロキシ設定がないので、`connect()`（`cloudflare:sockets`）で SOCKS5 を話した
- SOCKS5 の手順は通る
  - あいさつ：`05 01 02`
  - 認証：RFC 1929
  - 接続の依頼：`05 01 00 03` + ホスト名の長さ + ホスト名 + ポート
- `startTls()` で TLS を始めると、Cloudflare 配下のサイトとはつながらない
  - プロキシ側で記録した ClientHello に、SNI がない
  - `expectedServerHostname` を渡しても、SNI は入らない
  - Cloudflare 配下のサイトは `handshake_failure` で閉じる
  - SNI がなくても答えるサイトは通る
- `startTls()` の仕様は未確認
  - SNI が入らない理由（接続先に IP を渡したためか、仕様か）は不明
  - 暗号化の範囲も、公式資料の原文で未確認
  - 上の結果は、この実験の範囲だけのもの
- 経由先のサーバーで TLS を行う形（Worker が平文の HTTP を送り、サーバーが TLS で取る）は動く
  - NukiBooks は 403
  - 推測：サーバーの Python（OpenSSL）の指紋が止められている
- Workers の送信元 IP は、公開の `ips-v4` の外（104.28.x.x）
  - Cloudflare の範囲で、経由先の許可を絞る方法は使えない
  - 経由先には認証をかけた

## 6. twivideo.net（heros）：Workers の本番では通らない

- 本番の heros は、Cloudflare のプロキシを突破できていない（確認：2026-11-27）
- Workers の本番（`--remote`）は、どのサイトでも通らない。通るのは、サイトのカスタムルールに穴がある場合だけ（3 章の HentaiName）
- 通るのは手元で動かしたときだけ。5.1 と 5.2 の `--remote` と `--local` の差と同じ形
- 手元の結果の出どころ：Windows ノートの Claude の記録（2026-10-28 04:10〜05:05）
  - 手元の Node（`node:https`）と本物の curl での結果。Workers では未実施
  - 毎回完全なハンドシェイク：6 回中 6 回が 403
  - セッションを再利用できる状態（同じプロセスの 2 回目以降）：ほぼ 200
  - `Referer`、`Origin` を足しても変わらない
- 「TLS セッション再開が原因」は Claude の解釈。未確認
