import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatsCard(props: {
  title: string;
  value: string | number;
  description?: string;
}): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {props.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-brand-navy">{props.value}</div>
        {props.description ? (
          <p className="mt-1 text-xs text-slate-500">{props.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
