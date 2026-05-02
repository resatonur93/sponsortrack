import * as React from "react";
import { cn } from "@/lib/utils";

type HintTextProps = React.HTMLAttributes<HTMLParagraphElement> & {
  /** When true, use error styling (still use role="alert" on parent if dynamic). */
  error?: boolean;
};

/** Short helper under fields or actions; prefer over raw muted paragraphs. */
function HintText({ className, error, ...props }: HintTextProps): JSX.Element {
  return (
    <p
      className={cn(
        "text-xs leading-relaxed",
        error ? "font-medium text-danger" : "text-slate-600",
        className
      )}
      {...props}
    />
  );
}

export { HintText };
