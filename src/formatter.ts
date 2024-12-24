import { URL_PATTERN } from "./consts.js";

export function getUrls(content: string): string[] {
    return [...content.matchAll(URL_PATTERN)].map((el) => el[0]);
}

export function resultToText(
    resultMap: SearchResultMap,
    originalQuery: string[] | undefined = undefined
): string[] {
    let lines: string[] = [];
    const results = Object.entries(resultMap);

    for (let i: number = 0; results.length > i; i++) {
        const [query, result] = results[i];
        lines.push("## " + query);
        if (originalQuery) {
            lines.push("-# 元のクエリ：" + originalQuery[i]);
        }

        if (result.length) {
            const legal: string[] = result
                .filter((r) => r.isLegal)
                .map((r, i) => `${i + 1}. ${r.url}`);

            if (legal.length) {
                lines.push("### 合法：", ...legal);
            }

            const leak: string[] = result
                .filter((r) => !r.isLegal)
                .map((r, i) => `${i + 1}. ${r.url}`);

            if (leak.length) {
                lines.push("### 違法：", ...leak);
            }
        } else {
            lines.push("### 無し");
        }
    }

    if (lines.length) {
        lines.unshift("# 検索結果");
    } else {
        lines = ["# 検索結果", "## 無し"];
    }

    return lines;
}

export function splitText(lines: string[], maxLength: number = 2000): string[] {
    const contents: string[] = [];

    let text: string = "";

    for (const line of lines) {
        if (text.length + line.length > maxLength) {
            contents.push(text.slice(0, -1));

            text = "";
        }

        text += line + "\n";
    }

    if (text) {
        contents.push(text.slice(0, -1));
    }

    return contents;
}

export function createErrorLog(
    queries: string[],
    command: string,
    isMagazine: boolean,
    e: Error
): string {
    return `コマンド: \`/${command}\`
雑誌か:   \`/${isMagazine ? "はい" : "いいえ"}\`
入力:
\`\`\`
${queries.join("\n")}
\`\`\`
エラー内容:
\`\`\`
${(e as any as Error).stack}
\`\`\``;
}
