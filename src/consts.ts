import { MessageFlags, type APIInteractionResponseCallbackData } from 'discord-api-types/v10';

export const MAX_MESSAGE_LENGTH: number = 2000;

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `#### エラーが発生しました
エラーを開発者に通知しました`;

export const ERROR_RESPONSE: APIInteractionResponseCallbackData = {
    content: ERROR_MESSAGE,
    flags: MessageFlags.Ephemeral,
};
