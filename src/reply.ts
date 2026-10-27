import { MessageFlags } from 'discord-api-types/v10';
import { webhook, type CommandContext, type ComponentContext } from 'discord-hono';

/**
 * 遅延応答(resDefer)のあとに、メッセージを順に送る。
 *
 * c.followup(data) は元のメッセージの編集になるので、新しいメッセージは webhook で送る。
 * - editOriginal = true: 1件目で元のメッセージ(考え中の表示)を置き換え、2件目以降は新しいメッセージ
 * - editOriginal = false: すべて新しいメッセージ(元のメッセージを残したいとき)
 */
export async function reply(
    c: CommandContext | ComponentContext,
    contents: string[],
    editOriginal: boolean = true
): Promise<void> {
    let edit = editOriginal;

    for (const content of contents) {
        if (edit) {
            edit = false;

            await c.flags('SUPPRESS_EMBEDS').followup({
                content,
                allowed_mentions: { parse: [] },
            });

            continue;
        }

        await webhook(
            `https://discord.com/api/v10/webhooks/${c.env.APPLICATION_ID}/${c.interaction.token}`,
            {
                content,
                flags: MessageFlags.SuppressEmbeds,
                allowed_mentions: { parse: [] },
            }
        );
    }
}
