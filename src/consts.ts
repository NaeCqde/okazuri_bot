import {
    InteractionResponseType,
    MessageFlags,
    type APIInteractionResponse,
} from "@discordcf/framework";

export const MAX_MESSAGE_LENGTH: number = 2000;

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `エラーが発生しました
正しく実行しているのに何度もエラーが発生する場合は @kusony のDMへ
「オカズリBOTの検索でエラーが発生した」とDiscordの画面全体が収まっているスクリーンショットを送信してください`;

export const ERROR_RESPONSE: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
        flags: MessageFlags.Ephemeral,
        content: ERROR_MESSAGE,
    },
};
