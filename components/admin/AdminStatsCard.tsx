export function AdminStatsCard(props: {
  title: string;
  value: string | number;
  hint?: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-700 bg-[#1E293B] p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {props.title}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-50">{props.value}</p>
      {props.hint ? (
        <p className="mt-1 text-xs text-slate-500">{props.hint}</p>
      ) : null}
    </div>
  );
}
