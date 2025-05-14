import {
    InteractionResponseType,
    MessageFlags,
    type APIInteractionResponse,
} from '@discordcf/framework';

export const MAX_MESSAGE_LENGTH: number = 2000;

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `### エラーが発生しました
エラーを開発者に通知致しました。
申し訳ございませんが今後、改善に努めさせていただきますので、性癖バレはご了承くださいませ。`;

export const ERROR_RESPONSE: APIInteractionResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
        flags: MessageFlags.Ephemeral,
        content: ERROR_MESSAGE,
    },
};
