import { cn } from "@/lib/utils";

export function DocumentTimelineItem(props: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <li className={cn("relative", props.className)}>
      <span
        className="absolute -left-[29px] top-4 h-3 w-3 rounded-full bg-brand-royal ring-4 ring-white"
        aria-hidden
      />
      {props.children}
    </li>
  );
}
