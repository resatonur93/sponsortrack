export function AdminStatsCard(props: {
  title: string;
  value: string | number;
  hint?: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-brand-navy/10 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-slate">
        {props.title}
      </p>
      <p className="mt-1 text-2xl font-bold text-brand-navy">{props.value}</p>
      {props.hint ? (
        <p className="mt-1 text-xs text-brand-slate">{props.hint}</p>
      ) : null}
    </div>
  );
}
