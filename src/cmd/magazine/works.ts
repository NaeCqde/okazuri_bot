// 号の名前(レーベル名 and No.)を入力して、掲載作品の一覧を表示する
import { ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { makeSlashCommand, makeStringOption } from 'discord-hono';
import { drizzle } from 'drizzle-orm/d1';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../../consts';
import { productUrl } from '../../dlsite';
import { createErrorLog, formatDate, splitText } from '../../formatter';
import { factory } from '../../init';
import { reply } from '../../reply';
import { listWorks, NotFoundError, searchNumberNames } from '../../magazines';

export const worksCommand = factory.autocomplete(
    makeSlashCommand('works', 'Show a list of works published in the magazine')
        .description_localizations({
            [Locale.Japanese]: '雑誌に掲載されている作品一覧を表示します',
        })
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .options([
            makeStringOption('magazine', 'Please enter the magazine')
                .name_localizations({ [Locale.Japanese]: '雑誌' })
                .description_localizations({
                    [Locale.Japanese]: '雑誌を入力してください',
                })
                .autocomplete(true)
                .required(true),
        ]),
    // 入力中の候補(新しい号から)
    async (c) => {
        let names: string[] = [];

        try {
            names = await searchNumberNames(drizzle(c.env.DB), String(c.focused?.value ?? ''));
        } catch (e) {
            console.error('okazuri: works autocomplete failed', e);
        }

        return c.resAutocomplete(
            names.filter((n) => n.length <= 100).map((n) => ({ name: n, value: n }))
        );
    },
    (c) => {
        const magazine = c.var.magazine;

        if (!magazine) return c.res(ERROR_RESPONSE);

        return c.resDefer(async (c) => {
            let result: Awaited<ReturnType<typeof listWorks>>;

            try {
                result = await listWorks(drizzle(c.env.DB), magazine);
            } catch (e: any) {
                // 入力違いはユーザーに案内するだけで、開発者には通知しない
                if (e instanceof NotFoundError) {
                    await c.followup({
                        content: `「${magazine}」という雑誌は見つかりませんでした。入力欄に出る候補から選んでください。`,
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
                        content: createErrorLog([magazine], 'works', false, e as Error),
                    }),
                });

                return;
            }

            const { number, works } = result;

            const lines: string[] = [
                `# [${number.name}](${productUrl(number.id)})`,
                `-# 発売日 ${formatDate(number.date)}・${works.length}作品`,
                ...works.map(
                    (work) =>
                        `${work.position}. [${work.name}](${productUrl(work.id)}) / ${work.authorName}`
                ),
            ];

            await reply(c, splitText(lines));
        });
    }
);
