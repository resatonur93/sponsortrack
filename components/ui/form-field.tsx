import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { HintText } from "@/components/ui/hint-text";

export type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Label + control + hint/error. Set matching `id` / `htmlFor` on the control
 * (`<Input id={id} />`, `<SelectTrigger id={id} />`, etc.) and `aria-invalid={!!error}` when supported.
 */
function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps): JSX.Element {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className={cn(error && "text-danger")}>
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      <div
        className={cn(
          error &&
            "[&_input]:border-danger [&_input]:focus-visible:ring-danger/25 [&_button[role=combobox]]:border-danger"
        )}
      >
        {children}
      </div>
      {error ? (
        <HintText id={`${id}-err`} role="alert" error>
          {error}
        </HintText>
      ) : hint ? (
        <HintText id={`${id}-hint`}>{hint}</HintText>
      ) : null}
    </div>
  );
}

export { FormField };
