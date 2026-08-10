import type { DailyActivity } from '../../lib/analytics';

export function ActivityChart({ activity }: { activity: DailyActivity[] }) {
  const max = Math.max(1, ...activity.map((item) => item.completed + item.uncompleted));
  return (
    <div className="flex min-w-0 w-full h-44 items-end gap-1 overflow-hidden">
      {activity.map((item) => (
        <div key={item.date} className="group flex min-w-0 h-full flex-1 flex-col justify-end">
          <div className="relative flex min-w-0 h-full items-end justify-center gap-px">
            <div
              title={`${item.date}: ${item.completed} completed`}
              className="min-w-0 flex-1 rounded-t bg-primary"
              style={{ height: `${(item.completed / max) * 100}%` }}
            />
            <div
              title={`${item.date}: ${item.uncompleted} uncompleted`}
              className="min-w-0 flex-1 rounded-t bg-amber-300"
              style={{ height: `${(item.uncompleted / max) * 100}%` }}
            />
          </div>
          {(item.date.endsWith('-01') || item.date === activity[activity.length - 1]?.date) && (
            <span className="mt-2 truncate text-center text-[9px] text-slate-400">
              {item.date.slice(5)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function CumulativeChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(1, values.length - 1)) * 100},${100 - (value / max) * 90}`,
    )
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {values.map((value, index) => (
        <circle
          key={`${index}-${value}`}
          cx={(index / Math.max(1, values.length - 1)) * 100}
          cy={100 - (value / max) * 90}
          r="1.8"
          fill="#fff"
          stroke="#7c3aed"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
