import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gold text-navy-dark",
        secondary: "border-transparent bg-navy-light text-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-green-600/20 text-green-400 border-green-600/40",
        destructive: "border-transparent bg-destructive/20 text-red-400 border-destructive/40",
        warning: "border-transparent bg-gold/20 text-gold border-gold/40",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
