import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-navy text-white shadow-sm hover:bg-brand-gold hover:text-brand-navy",
        secondary:
          "border border-brand-navy/25 bg-white text-brand-navy shadow-sm hover:border-brand-gold hover:bg-brand-gold/15 hover:text-brand-navy",
        outline:
          "border border-slate-300/90 bg-white text-brand-navy hover:border-brand-gold hover:bg-brand-gold/10",
        ghost:
          "text-brand-navy hover:bg-brand-gold/12 hover:text-brand-navy",
        danger:
          "bg-brand-rose text-white shadow-sm hover:bg-brand-rose hover:shadow-[0_0_0_2px_rgba(212,175,135,0.45)]",
        success:
          "bg-brand-emerald text-white shadow-sm hover:bg-brand-emerald hover:shadow-[0_0_0_2px_rgba(212,175,135,0.45)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
