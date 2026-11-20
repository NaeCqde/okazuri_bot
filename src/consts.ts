import { MessageFlags, type APIInteractionResponseCallbackData } from 'discord-api-types/v10';

export const MAX_MESSAGE_LENGTH: number = 2000;

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `#### エラーが発生しました
エラーを開発者に通知しました`;

export const ERROR_RESPONSE: APIInteractionResponseCallbackData = {
    content: ERROR_MESSAGE,
    flags: MessageFlags.Ephemeral,
};

/** 検索結果の返信に使うメッセージの最大数。超えた分は省略する */
export const MAX_REPLY_MESSAGES: number = 2;

/** 結果が多くて省略したときに、続きを見てもらうサイトの検索ページ */
export const WEB_SEARCH_URL: string = 'https://okazuri.nae.quest/search';
