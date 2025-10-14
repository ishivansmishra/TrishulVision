import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & {
    children?: React.ReactNode;
    className?: string;
    htmlFor?: string;
  };

// Any alias for JSX usage to satisfy TSX children/className expectations
const LabelRootAny: any = LabelPrimitive.Root;

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(({ className, children, ...props }, ref) => {
  const restProps = props as Omit<React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>, "className" | "children"> & {
    htmlFor?: string;
  };
  return (
    <LabelRootAny ref={ref} className={cn(labelVariants(), className)} {...restProps}>
      {children}
    </LabelRootAny>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
