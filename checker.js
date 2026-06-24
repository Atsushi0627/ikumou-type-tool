/**
 * checker.js - 薬機法スキャン（自由入力テキストのNGワード検出）
 *
 * level3(赤) → level2(橙) → level1(黄) の優先度でハイライト。
 * 表示崩れを避けるため、高レベルで既にマークされた箇所は低レベルで重複マークしない。
 */

import { NG_DICTIONARY } from './ngDictionary.js';

/**
 * 入力テキストをスキャンし、NGワードをハイライトしたHTMLと検出リストを返す
 * @param {string} text スキャン対象テキスト
 * @returns {{ html: string, hits: Array<{word,level,label,color,desc}> }}
 */
export function scanText(text) {
  if (!text) return { html: '', hits: [] };

  const hits = [];
  const levels = ['level3', 'level2', 'level1']; // 高レベル優先

  // 各ワードの出現位置と適用レベルを収集
  // マップ: 検出ワード → 最高レベルエントリ
  const wordMap = new Map();

  levels.forEach(lv => {
    const entry = NG_DICTIONARY[lv];
    entry.words.forEach(word => {
      if (text.includes(word) && !wordMap.has(word)) {
        wordMap.set(word, { word, level: lv, label: entry.label, color: entry.color, desc: entry.desc });
      }
    });
  });

  // 検出リスト（レベル順でソート）
  const levelOrder = { level3: 0, level2: 1, level1: 2 };
  const detectedWords = [...wordMap.values()];
  detectedWords.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  hits.push(...detectedWords);

  // ハイライトHTML生成
  // テキストを文字単位でスキャンして、検出ワードをspanに置換
  // 高レベルから順に適用し、既マーク箇所はスキップ
  let html = buildHighlightedHtml(text, detectedWords);

  return { html, hits };
}

/**
 * テキストにハイライトを適用してHTMLを生成
 * 高優先度のワードから順に処理し、既マーク範囲と重複しないようにする
 */
function buildHighlightedHtml(text, detectedWords) {
  if (detectedWords.length === 0) return escapeHtml(text);

  // 文字インデックスに対してどのワードが割り当てられるかを決定
  const markedRanges = []; // { start, end, entry }

  detectedWords.forEach(entry => {
    const word = entry.word;
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(word, searchFrom);
      if (idx === -1) break;
      const end = idx + word.length;

      // 既存マーク範囲と重複しないか確認
      const overlaps = markedRanges.some(r => idx < r.end && end > r.start);
      if (!overlaps) {
        markedRanges.push({ start: idx, end, entry });
      }
      searchFrom = idx + 1;
    }
  });

  // 開始位置でソート
  markedRanges.sort((a, b) => a.start - b.start);

  // テキストを組み立て
  let result = '';
  let cursor = 0;

  for (const range of markedRanges) {
    // マーク前のプレーンテキスト
    result += escapeHtml(text.slice(cursor, range.start));
    // ハイライト部分
    const { color, label, desc } = range.entry;
    const word = escapeHtml(text.slice(range.start, range.end));
    result += `<mark class="ng-mark" style="background:${color}22;border-bottom:2px solid ${color};color:${color};font-weight:600;border-radius:2px" title="${escapeAttr(label)}｜${escapeAttr(desc)}">${word}</mark>`;
    cursor = range.end;
  }

  // 残りのプレーンテキスト
  result += escapeHtml(text.slice(cursor));

  return result;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
