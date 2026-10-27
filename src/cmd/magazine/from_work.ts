// 作品名から、掲載されている雑誌(レーベル名 and No.)を表示する
import { ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { makeSlashCommand, makeStringOption } from 'discord-hono';
import { drizzle } from 'drizzle-orm/d1';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../../consts';
import { productUrl } from '../../dlsite';
import { createErrorLog, formatDate, splitText } from '../../formatter';
import { factory } from '../../init';
import { reply } from '../../reply';
import { findWorks, NotFoundError, searchWorkNames } from '../../magazines';

export const fromWorkCommand = factory.autocomplete(
    makeSlashCommand('from_work', 'Search for magazine by title')
        .description_localizations({
            [Locale.Japanese]: 'タイトルから雑誌を検索します',
        })
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .options([
            makeStringOption('title', 'Please enter a title')
                .name_localizations({ [Locale.Japanese]: 'タイトル' })
                .description_localizations({ [Locale.Japanese]: 'タイトルを入力してください' })
                .autocomplete(true)
                .required(true),
        ]),
    // 入力中の作品名の候補
    async (c) => {
        let names: string[] = [];

        try {
            names = await searchWorkNames(drizzle(c.env.DB), String(c.focused?.value ?? ''));
        } catch (e) {
            console.error('okazuri: from_work autocomplete failed', e);
        }

        return c.resAutocomplete(
            names.filter((n) => n.length <= 100).map((n) => ({ name: n, value: n }))
        );
    },
    (c) => {
        const title = c.var.title;

        if (!title) return c.res(ERROR_RESPONSE);

        return c.resDefer(async (c) => {
            let found: Awaited<ReturnType<typeof findWorks>>;

            try {
                found = await findWorks(drizzle(c.env.DB), title);
            } catch (e: any) {
                // 入力違いはユーザーに案内するだけで、開発者には通知しない
                if (e instanceof NotFoundError) {
                    await c.followup({
                        content: `「${title}」という作品は見つかりませんでした。タイトルを確認してください。`,
                        allowed_mentions: { parse: [] },
                    });

                    return;
                }

                await c.followup({
                    content: ERROR_MESSAGE,
                    allowed_mentions: { parse: [] },
                });

                await fetch(c.env.ERROR_LOG_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: createErrorLog([title], 'from_work', true, e as Error),
                    }),
                });

                return;
            }

            // 同名の作品があるときは、新しい号から並べて全部出す
            const lines: string[] = found.flatMap(({ work, number, authorName }) => [
                `## [${work.name}](${productUrl(work.id)}) / ${authorName}`,
                `[${number.name}](${productUrl(number.id)}) の ${work.position} 番目 (発売日 ${formatDate(number.date)})`,
            ]);

            await reply(c, splitText(lines));
        });
    }
);
