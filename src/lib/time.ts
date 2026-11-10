const JST_OFFSET_HOURS = 9;

const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** ゲーム内日時（日本標準時）の表示用文字列 */
export function formatGameTime(date: Date): string {
  return formatter.format(date);
}

/** 同じ日（JST）の指定時刻に変更した Date を返す */
export function withJstHour(base: Date, hour: number): Date {
  const jst = new Date(base.getTime() + JST_OFFSET_HOURS * 3_600_000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), hour - JST_OFFSET_HOURS, 0, 0));
}

export function formatHeight(heightM: number): string {
  if (heightM >= 10_000) return `${Math.round(heightM / 1000).toLocaleString('ja-JP')} km`;
  return `${Math.round(heightM).toLocaleString('ja-JP')} m`;
}
