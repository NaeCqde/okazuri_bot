import { pronounce } from './pronounce.js';

export async function rewrite(text: string, level: 1 | 2) {
    text = text.trim();
    switch (level) {
        case 1:
            if (!text.match(/hentai/)) text += ' hentai';
        case 2:
            text = await pronounce(text);
    }

    return text;
}
