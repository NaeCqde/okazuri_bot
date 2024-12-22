import {
    InteractionResponseType,
    MessageFlags,
    type APIInteractionResponse,
} from "@discordcf/framework";

export const MAX_MESSAGE_LENGTH: number = 2000;

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `エラーが発生しました
エラー通知チャンネルへ検索クエリを送信しました。
今後の改善に努めますので性癖バレは許してください。
ごめんなさい`;

export const ERROR_RESPONSE: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
        flags: MessageFlags.Ephemeral,
        content: ERROR_MESSAGE,
    },
};
