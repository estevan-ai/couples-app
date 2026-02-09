export interface EmojiPattern {
    char: string;
    meaning: string;
    category: 'Single' | 'Combo';
    context?: string;
}

export const EMOJI_CATEGORIES = {
    "Quick": ["❤️", "🔥", "😂", "😮", "😢", "👍"],
    "Affection": ["🥰", "😘", "😍", "🫂", "💖", "💘", "💓", "🫶"],
    "Fun": ["🤣", "😝", "🤪", "🥳", "😎", "🤩", "👻", "👀"],
    "Desire": ["🥵", "🫦", "🤤", "😈", "🍆", "🍑", "💦", "⛓️"],
    "Appreciation": ["🙏", "👏", "🙌", "🥂", "🏆", "💯", "🌟", "💐"]
};

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

export const SEXTING_PATTERNS = [
    { level: 'Beginner', combo: '🍑 + 😘', meaning: 'Physical attraction + affection', translation: '“I’m attracted to your body, but I’m being sweet about it.”' },
    { level: 'Beginner', combo: '😉 + 🍆', meaning: 'Testing sexual comfort', translation: '“I’m hinting at sexual interest to see if you’re okay with that.”' },
    { level: 'Beginner', combo: '😏 + 🔥', meaning: 'Flirtation + arousal', translation: '“I’m feeling attracted and a little turned on.”' },
    { level: 'Intermediate', combo: '🍆 + 🍑', meaning: 'Mutual sexual focus', translation: '“I’m thinking about us having sex.”' },
    { level: 'Intermediate', combo: '👅 + 😈', meaning: 'Teasing sexual intent', translation: '“I’m being playful and sexual without spelling it out.”' },
    { level: 'Intermediate', combo: '🍑 + 💦', meaning: 'Heightened arousal', translation: '“I’m very turned on thinking about you.”' },
    { level: 'Advanced', combo: '🍆 + 💦', meaning: 'Strong arousal / climax implication', translation: '“I’m extremely aroused right now.”' },
    { level: 'Advanced', combo: '👅 + 🍑 + 😏', meaning: 'Specific sexual teasing', translation: '“I’m hinting at a very specific sexual idea.”' },
    { level: 'Advanced', combo: '😈 + 🍆 + 🔥', meaning: 'Bold sexual invitation', translation: '“I’m openly in a sexual mood and inviting you into it.”' },
];
