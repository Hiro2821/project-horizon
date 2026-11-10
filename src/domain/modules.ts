import type { StatModule, StatValue } from './types';

/**
 * 統計モジュールのレジストリ。
 * 現時点では何も登録されておらず、UIはすべて「データ未登録」と表示する。
 * 将来: registerStatModule({ id: 'population', ... }) で出典付きデータを追加する。
 */
export const STAT_SLOTS = [
  { id: 'population', label: '人口' },
  { id: 'economy', label: '経済' },
  { id: 'transport', label: '交通' },
  { id: 'environment', label: '環境' },
] as const;

const registry = new Map<string, StatModule>();

export function registerStatModule(module: StatModule): void {
  registry.set(module.id, module);
}

export interface StatRow {
  id: string;
  label: string;
  value: StatValue | undefined;
}

/** 地域コードに対する各スロットの値。未登録なら value は undefined。 */
export function lookupStats(regionCode: string): StatRow[] {
  return STAT_SLOTS.map((slot) => ({
    id: slot.id,
    label: slot.label,
    value: registry.get(slot.id)?.lookup(regionCode),
  }));
}
