const initials = { b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ', l: 'ㄌ', g: 'ㄍ', k: 'ㄎ', h: 'ㄏ', j: 'ㄐ', q: 'ㄑ', x: 'ㄒ', zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ' };
const finals = { a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ', an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ', i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iou: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ', u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', uei: 'ㄨㄟ', uan: 'ㄨㄢ', uen: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ', ong: 'ㄨㄥ', ü: 'ㄩ', üe: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ' };
const marks = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' };
export function pinyinSyllableToZhuyin(value, tone) {
    let text = value.toLowerCase().normalize('NFC').replace(/u:|v/g, 'ü');
    if ((text.match(/[āēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜ]/g) || []).length > 1)
        return '';
    const numbered = text.match(/([1-5])$/);
    if (numbered) {
        tone ??= Number(numbered[1]);
        text = text.slice(0, -1);
    }
    const vowels = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'];
    for (let i = 0; i < vowels.length; i++)
        for (let j = 0; j < vowels[i].length; j++)
            if (text.includes(vowels[i][j])) {
                tone ??= i + 1;
                text = text.replaceAll(vowels[i][j], 'aeiouü'[j]);
            }
    if (!/^[a-züê]+$/.test(text))
        return '';
    const specials = { m: 'ㄇ', n: 'ㄋ', ng: 'ㄫ', hm: 'ㄏㄇ', hng: 'ㄏㄫ' };
    if (specials[text])
        return specials[text] + marks[tone ?? 5];
    if (text.startsWith('y')) {
        const y = { yi: 'i', ya: 'ia', ye: 'ie', yao: 'iao', you: 'iou', yan: 'ian', yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong', yu: 'ü', yue: 'üe', yuan: 'üan', yun: 'ün' };
        text = y[text] || '';
    }
    else if (text.startsWith('w')) {
        const w = { wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'uei', wan: 'uan', wen: 'uen', wang: 'uang', weng: 'ueng' };
        text = w[text] || '';
    }
    const match = text.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])/);
    const initial = match?.[1] || '';
    let final = text.slice(initial.length);
    let erhua = false;
    if (final.endsWith('r') && final !== 'er') {
        erhua = true;
        final = final.slice(0, -1);
    }
    if (['j', 'q', 'x'].includes(initial) && final.startsWith('u'))
        final = 'ü' + final.slice(1);
    if (final === 'iu')
        final = 'iou';
    if (final === 'ui')
        final = 'uei';
    if (final === 'un')
        final = 'uen';
    const apical = ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(initial) && final === 'i';
    if (apical)
        final = '';
    if (!text || (!final && !apical) || (final && !finals[final]))
        return '';
    if (tone !== undefined && !(tone >= 1 && tone <= 5))
        return '';
    return (initials[initial] || '') + (finals[final] || '') + (erhua ? 'ㄦ' : '') + marks[tone ?? 5];
}
export function wordZhuyin(pinyin, tones, word) {
    let syllables = pinyin.trim().split(/[\s'’·-]+/).filter(Boolean);
    const count = word ? [...word].length : tones.length;
    // Lexirise often joins syllables (e.g. bóshì). Segment using the known
    // character count and valid phonetic spellings, respecting explicit boundaries.
    if (count && syllables.length !== count) {
        const chunks = syllables;
        const failed = new Set();
        const segment = (chunk, offset, used) => {
            if (chunk === chunks.length)
                return used === count ? [] : null;
            if (offset === chunks[chunk].length)
                return segment(chunk + 1, 0, used);
            if (used >= count)
                return null;
            const key = `${chunk}:${offset}:${used}`;
            if (failed.has(key))
                return null;
            for (let end = Math.min(chunks[chunk].length, offset + 8); end > offset; end--) {
                const candidate = chunks[chunk].slice(offset, end);
                if (/^(m|n|ng|hm|hng)$/i.test(candidate) && chunks[chunk] !== candidate)
                    continue;
                if (!pinyinSyllableToZhuyin(candidate, tones[used] || undefined))
                    continue;
                const rest = segment(chunk, end, used + 1);
                if (rest)
                    return [candidate, ...rest];
            }
            failed.add(key);
            return null;
        };
        syllables = segment(0, 0, 0) || [];
    }
    if (!syllables.length || (word && syllables.length !== [...word].length))
        return '';
    const converted = syllables.map((s, i) => pinyinSyllableToZhuyin(s, tones[i] || undefined));
    return converted.every(Boolean) ? converted.join(' ') : '';
}
