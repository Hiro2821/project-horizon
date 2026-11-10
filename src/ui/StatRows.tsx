import { lookupStats } from '../domain/modules';

/** 統計スロットの一覧。値が未登録なら必ず「データ未登録」と表示する（架空値は出さない）。 */
export function StatRows({ regionCode }: { regionCode: string }) {
  return (
    <dl className="stat-rows">
      {lookupStats(regionCode).map((row) => (
        <div className="stat-row" key={row.id}>
          <dt>{row.label}</dt>
          <dd className={row.value ? '' : 'unregistered'}>
            {row.value ? `${row.value.value}${row.value.unit ?? ''}` : 'データ未登録'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
