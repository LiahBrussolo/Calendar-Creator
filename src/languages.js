'use strict';

// A broad set of world languages (includes the six UN official languages).
// Order here does not matter — the list is sorted alphabetically when built.
const LANG_CODES = [
  'en', 'fr', 'es', 'ar', 'ru', 'zh',
  'zh-Hant', 'pt', 'pt-BR', 'de', 'it', 'ja', 'ko', 'hi', 'bn', 'pa', 'jv',
  'te', 'mr', 'ta', 'ur', 'gu', 'vi', 'tr', 'fa', 'pl', 'uk', 'nl', 'th',
  'id', 'ms', 'fil', 'sw', 'ha', 'yo', 'ig', 'am', 'my', 'km', 'lo', 'si',
  'ne', 'ml', 'kn', 'or', 'as', 'sd', 'ps', 'ckb', 'ku', 'az', 'kk', 'ky',
  'uz', 'tk', 'tg', 'tt', 'mn', 'ka', 'hy', 'he', 'el', 'ro', 'hu', 'cs',
  'sk', 'sl', 'hr', 'sr', 'bs', 'mk', 'bg', 'sq', 'be', 'lt', 'lv', 'et',
  'fi', 'sv', 'da', 'no', 'is', 'fo', 'ga', 'gd', 'cy', 'eu', 'ca', 'gl',
  'oc', 'br', 'lb', 'mt', 'af', 'zu', 'xh', 'st', 'tn', 'sn', 'ny', 'rw',
  'lg', 'so', 'ti', 'om', 'mg', 'ht', 'haw', 'sm', 'mi', 'to', 'fj', 'su',
  'ceb', 'la',
];

const stripDiacritics = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function buildLanguages() {
  const enNames = new Intl.DisplayNames(['en'], { type: 'language' });
  const seen = new Set();
  const list = [];
  for (const code of LANG_CODES) {
    if (seen.has(code)) continue;
    seen.add(code);
    let name;
    let native;
    try { name = enNames.of(code) || code; } catch { name = code; }
    try { native = new Intl.DisplayNames([code], { type: 'language' }).of(code) || name; } catch { native = name; }
    const haystack = stripDiacritics(`${name} ${native} ${code}`).toLowerCase();
    list.push({ code, name, native, haystack });
  }
  list.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return list;
}

window.LANGUAGES = buildLanguages();
window.stripDiacritics = stripDiacritics;
