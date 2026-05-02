import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type PageLoadingProps = {
  message: string;
  className?: string;
  minHeight?: "sm" | "md" | "lg";
};

const minH = {
  sm: "min-h-[20vh]",
  md: "min-h-[30vh]",
  lg: "min-h-[40vh]",
};

/** Centered spinner + text for route-level and panel loading. */
function PageLoading({ message, className, minHeight = "md" }: PageLoadingProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-slate-600",
        minH[minHeight],
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner aria-label={message} />
      <span className="text-sm font-medium text-slate-700">{message}</span>
    </div>
  );
}

export { PageLoading };
