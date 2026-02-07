export interface EmojiPattern {
    char: string;
    meaning: string;
    category: 'Single' | 'Combo';
    context?: string;
}

export const EMOJI_PATTERNS: EmojiPattern[] = [
    // Singles
    { char: '🍆', meaning: 'Male genitalia or sexual intent', category: 'Single' },
    { char: '🍑', meaning: 'Buttocks or body attraction', category: 'Single' },
    { char: '💦', meaning: 'Arousal or bodily fluids', category: 'Single' },
    { char: '😏', meaning: 'Suggestive flirtation / hinting', category: 'Single' },
    { char: '😉', meaning: 'Wink / playful innuendo', category: 'Single' },
    { char: '😈', meaning: 'Mischievous, horny energy', category: 'Single' },
    { char: '👅', meaning: 'Oral activity suggestion', category: 'Single' },

    // Combos
    { char: '🍆 + 🍑', meaning: 'Penetrative sexual interest', category: 'Combo' },
    { char: '🍆 + 💦', meaning: 'Climax / finish', category: 'Combo' },
    { char: '👅 + 🍑', meaning: 'Oral focus / teasing', category: 'Combo' },
    { char: '🍆 + 😏', meaning: 'Suggestive invitation', category: 'Combo' },
    { char: '💦 + 😈', meaning: 'High arousal / naughty mood', category: 'Combo' },
    { char: '☁️ + 💥', meaning: 'Climax / explosion imagery', category: 'Combo' },
];
