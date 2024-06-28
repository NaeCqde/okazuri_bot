import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageApplicationCommandInteraction,
} from "@discordcf/framework";

import { URL_PATTERN } from "./consts.js";

export function getUrls(content: string): string[] {
    return [...content.matchAll(URL_PATTERN)].map((el) => el[0]);
}

export function resultToText(resultMap: SearchResultMap): string[] {
    let lines: string[] = [];

    for (const [query, result] of Object.entries(resultMap)) {
        if (result.length) {
            lines.push("## " + query);

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
            lines.push("## " + query, "### 無し");
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
    source: APIChatInputApplicationCommandInteraction | APIMessageApplicationCommandInteraction,
    e: Error,
    command: string
): string {
    return `サーバーID: 　\`${source.guild_id || "DM"}\`
チャンネルID: \`${source.channel.id}\`

ユーザーID: 　\`${(source.member ? source.member.user : source.user)?.id}\`
コマンド: 　　\`/${command}\`

エラー内容:
\`\`\`
${(e as any as Error).stack}
\`\`\``;
}
