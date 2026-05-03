import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-100 text-zinc-900",
        secondary: "border-transparent bg-zinc-800 text-zinc-100",
        destructive: "border-transparent bg-red-500 text-zinc-50",
        outline: "border-zinc-700 text-zinc-100",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
