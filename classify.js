/**
 * classify.js - 九星×マヤ → 4タイプ集約
 *
 * 設計の核。2つの暦の2軸スコアを統合して接客タイプを確定する。
 * 一致時は信頼度高、不一致時は九星1.5:マヤ1.0の加重平均で判定。
 */

import { KYUSEI_AXIS } from './kyusei.js';
import { MAYA_AXIS } from './maya.js';

/**
 * (x,y) を4タイプに振り分け
 *   X≦0, Y≦0 → type1（じっくり納得）
 *   X>0,  Y≦0 → type3（共感重視）
 *   X>0,  Y>0  → type4（勢い行動）
 *   X≦0, Y>0  → type2（情熱直感）
 * @param {number} x
 * @param {number} y
 * @returns {'type1'|'type2'|'type3'|'type4'}
 */
function toType(x, y) {
  if (x <= 0 && y <= 0) return 'type1';
  if (x >  0 && y <= 0) return 'type3';
  if (x >  0 && y >  0) return 'type4';
  return 'type2'; // x≦0, y>0
}

/**
 * タイプを確定し、接客カンペ用の情報を返す
 * @param {number} starNo  九星本命星番号 (1-9)
 * @param {number} sealNo  マヤ太陽の紋章番号 (1-20)
 * @returns {{
 *   type: string,
 *   label: string,
 *   confidence: 'high'|'kyusei-weighted',
 *   intensity: number,
 *   detail: {
 *     kyuseiType: string,
 *     mayaType: string,
 *     finalX: number,
 *     finalY: number
 *   }
 * }}
 */
export function classify(starNo, sealNo) {
  const k = KYUSEI_AXIS[starNo]; // {x, y}
  const m = MAYA_AXIS[sealNo];   // {x, y}

  const kyuseiType = toType(k.x, k.y);
  const mayaType   = toType(m.x, m.y);

  let finalX, finalY, type, confidence;

  if (kyuseiType === mayaType) {
    // 両暦一致 → そのタイプ確定・信頼度高
    type = kyuseiType;
    confidence = 'high';
    finalX = (k.x + m.x) / 2;
    finalY = (k.y + m.y) / 2;
  } else {
    // 不一致 → 九星優先の加重平均（九星1.5 : マヤ1.0）
    finalX = (k.x * 1.5 + m.x * 1.0) / 2.5;
    finalY = (k.y * 1.5 + m.y * 1.0) / 2.5;
    type = toType(finalX, finalY);
    confidence = 'kyusei-weighted';
  }

  // 濃さ：原点からの距離（|x|+|y|）。最大4。★5段階に変換
  const dist = Math.abs(finalX) + Math.abs(finalY);
  const intensity = Math.min(5, Math.round(dist / 4 * 5)); // 0-5

  const labels = {
    type1: 'じっくり納得型',
    type2: '情熱直感型',
    type3: '共感重視型',
    type4: '勢い行動型'
  };

  return {
    type,
    label: labels[type],
    confidence,
    intensity,
    detail: {
      kyuseiType,
      mayaType,
      finalX: Math.round(finalX * 10) / 10,
      finalY: Math.round(finalY * 10) / 10
    }
  };
}
