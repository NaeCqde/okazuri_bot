# 引継ぎ文：Cloudflare 配下のサイトを通した方法

## 前提

対象は、次の条件のサイトです。

- Cloudflare のプロキシを通っています。
- Under Attack モードは、オフです。
- 全ページを止める強制チャレンジ（Turnstile など）のルールは、ありません。

それでも、素の HTTP クライアントで取りに行くと、403 が返ります。

## 1. プロトコルは、HTTP/2 と HTTP/1.1 の両方を試す

通るかどうかは、クライアントとプロトコルの組み合わせで決まります。どちらが通るかは、クライアントごとに違います（詳しくは第 7 章）。

- **Rust の reqwest（rustls）：HTTP/2 で通ります。** HTTP/1.1 では、ブラウザと同じ User-Agent やヘッダーを付けても、全サイトが 403 でした。機能 `http2` を有効にします。rustls は ALPN で `h2,http/1.1` を自動で出すので、機能を有効にするだけで HTTP/2 になります。
- **ALPN は、手で設定しないでください。** `http2` 機能が無効のとき、手で `h2` を設定すると、実行時にパニックします。
- **これで通ったサイト。** IMHentai、NijiGazo、NukiBooks、HentaiPaw です。
- **macOS 標準の `curl` は、逆です。** HTTP/1.1 で 200、既定の HTTP/2 で 403 でした。
- **Node の `fetch`（undici）は、** ブラウザの User-Agent を付けても、これらのサイトで 403 でした。
- **「HTTP/2 にすれば通る」とは、言えません。** 同じ TLS ライブラリでも、ClientHello の中身（暗号スイート、拡張、ALPN）で結果が変わります。まず、手元のクライアントで、両方のプロトコルを試してください。

## 2. ブラウザ風のヘッダーを付ける

ブラウザと同じヘッダーを付けています。`Accept`、`Sec-CH-UA` 系、`Upgrade-Insecure-Requests`、`Sec-Fetch-*`（Chrome 126 相当）です。

- ヘッダー 1 つずつの効果は、切り分けていません。
- 通るかどうかは、第 1 章と第 7 章のとおり、TLS の ClientHello とプロトコルで決まりました。ヘッダーは念のためです。

## 3. 例外：ブラウザの User-Agent にだけチャレンジを出すサイト

HentaiName は、ブラウザの User-Agent のときだけチャレンジを出します。素の User-Agent（例：`okazuri-search-api/1.0`）で、簡単な `Accept` だけを付けて取ると、通ります。

- 通らないサイトでは、ブラウザの User-Agent と素の User-Agent を、両方試してください。

## 4. reqwest のサンプルコード

`Cargo.toml`:

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "http2", "gzip", "brotli"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

`main.rs`（実際に動かして、HTTP/2 と 200 を確認しました）:

```rust
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, UPGRADE_INSECURE_REQUESTS, USER_AGENT};

/// Chrome 風のクライアント。`http2` 機能が有効なので、ALPN で HTTP/2 になる。
/// `http1_only()` は呼ばない。ALPN も手で設定しない。
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

Cloudflare 上の Workers（`wrangler dev --remote`）の `fetch` で、同じサイトを取りました。各サイトを 2 回ずつ取っています。

| サイト | 既定の User-Agent | ブラウザ風ヘッダー |
|---|---|---|
| HentaiName | 200 | 403（チャレンジ） |
| IMHentai | 403（チャレンジ） | 403（チャレンジ） |
| NijiGazo | 403 | 403 |
| NukiBooks | 403 | 403（チャレンジ） |
| HentaiPaw | 403 | 403 |

- Workers の `fetch` で通るのは、HentaiName（既定の User-Agent）だけです。ほかの 4 サイトは、再試行しても 403 でした。
- 当初「HentaiName は Workers では動かなかった」とされていましたが、これは誤りでした。サイトは Under Attack モードではありませんでした。

### 5.1 Workers から、別のサーバーを経由する

Workers の `fetch` にはプロキシの設定がありません。TCP ソケット（`cloudflare:sockets` の `connect()`）では、自分で SOCKS5 を話せます。

- **SOCKS5 の手順（あいさつ、認証、接続の依頼）は、問題なく通ります。** そのあと `startTls()` で TLS を始めます。
- **ただし、Cloudflare 配下のサイトには、HTTPS でつなげませんでした。** `startTls()` が送る ClientHello に、SNI が入っていません（`expectedServerHostname` を渡しても、入りませんでした）。Cloudflare 配下のサイトは、`handshake_failure` で閉じます。SNI がなくても答えるサイトは、通ります。
- **経由先のサーバーで TLS を行う形なら、動きます。** Worker が平文の HTTP をサーバーに送り、サーバーが目的地へ TLS で取りに行きます。NukiBooks では 403 でした（そのサーバーの Python（OpenSSL）の指紋が、止められたとみられます）。
- **Workers の送信元の IP は、公開されている Cloudflare の範囲（`ips-v4`）の外でした。** 送信元の IP で許可する使い方は、できません。経由先には、認証が必要です。

## 6. 過去の記録：Workers で、別のサイトを取っていた方法（現在は再現できていません）

過去に、別の Cloudflare Workers のプロジェクトが、twivideo.net を取っていました。当時、このサイトは Under Attack モードがオフでした（最近、オンになりました）。つまり、この章の方法は、Under Attack がオフのサイトについての記録です。

注意：この章は、過去の記録です。このサイトは今は Under Attack がオンで、今の Workers では確かめられません。第 5 章の今の結果（Workers の `fetch` で通るのは、HentaiName の既定の User-Agent だけ）と合わないので、この章の方法をそのまま使わないでください。

- **クライアント。** Workers の標準 `fetch` だけです。TLS の細工も、プロキシも、クッキー取得の仕組みもありません。
- **ヘッダー。** Edge/Chrome 134 風の一式を付けていました。`Accept`、`Accept-Language: ja`、`Accept-Encoding: gzip, deflate, br, zstd`、`Sec-Ch-Ua*` 一式、`Sec-Fetch-Dest/Mode/Site/User` です。
- **再試行。** 初回だけ 403 が返ることがあるので、失敗したら 1 回だけやり直していました。
- **TLS セッション再開の仮説（Workers の外での調査）。** Node と curl で調べたところ、決め手はヘッダーではなく、TLS の接続の仕方でした。`Referer` や `Origin` を足しても、変わりませんでした。毎回完全なハンドシェイクをすると、6 回中 6 回が 403 でした。セッション再開ができる 2 回目以降は、ほぼ 200 でした。最初の 1 回は、必ず 403 でした。Workers のランタイムが同じことをしているかは、未確認です。
- **この仮説は、NukiBooks では成り立ちません。** クライアントを毎回作り直して（毎回、完全なハンドシェイク）、10 回続けても、毎回 200 でした。第 7 章を見てください。

## 7. TLS の指紋についての実験（NukiBooks）

NukiBooks（Cloudflare 配下）で、クライアントごとに通るかどうかを調べました。結果は、サイトごと・クライアントごとに決まっていて、同じ条件なら毎回同じです。

### 7.1 Mac での結果（HTTP/2）

| クライアント | 結果 |
|---|---|
| macOS 標準の curl（SecureTransport）、既定 | 403（暗号スイート 49 個） |
| 同、HTTP/1.1 | 200 |
| 同、`--ciphers` で暗号スイートを 1 種類以上に絞る | 200（並びや種類は関係なし） |
| Go（net/http） | 暗号スイート 3〜25 個で 200 |
| Rust reqwest + rustls | 暗号スイート 1〜9 個すべてで 200 |
| Rust wreq（BoringSSL、指紋なし） | 403（暗号スイートを 4〜28 個に変えても同じ） |
| wreq + Chrome / Firefox / Safari の指紋 | 200 |
| Node の `fetch`（undici） | 403（暗号スイート 4〜52 個すべて） |

- **暗号スイートの数や並びは、決め手ではありません。** curl は、数を減らすと通りますが、wreq は減らしても通りません。
- **TLS セッション再開も、決め手ではありません。** reqwest を毎回作り直して（毎回、完全なハンドシェイク）、10 回続けても、毎回 200 でした。
- **curl の既定で、HTTP/2 だけが 403 になる理由。** 送られる ClientHello は、HTTP/2 と HTTP/1.1 で、ALPN だけが違います（JA4 の `h2` と `h1` の違い）。暗号スイートを変えると、JA4 の中ほどのハッシュも変わります。「JA4 の指紋ごとに、Cloudflare が評価している」と考えると、結果が説明できます。ただし、これは推測です。

### 7.2 Linux サーバーでの結果（HTTP/2）

データセンターの Linux サーバー 3 台から、同じ NukiBooks を取りました。

| クライアント | 結果（3 台とも） |
|---|---|
| reqwest（rustls、既定） | 200 |
| wreq（指紋なし、Chrome 147、Safari 18.5） | 200 |

- **Mac では 403 だった wreq（指紋なし）が、Linux サーバーでは 200 でした。** 指紋だけでなく、IP や回線の違いも結果に効いています。
- **1 台（vultr）では、Debian の curl（OpenSSL）は 403 でした。** この台では、ヘッダーや HTTP のバージョン、暗号スイートを変えても、curl は通りませんでした。同じ台で、reqwest と wreq は 200 でした。
- **まとめ。** サーバーからは、reqwest（rustls、HTTP/2）の既定のままで通りました。通らないときは、クライアントを変えると通る場合があります。
