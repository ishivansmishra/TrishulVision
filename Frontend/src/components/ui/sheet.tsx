import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

// Any aliases for JSX usage to satisfy TSX children/className/ref expectations
const SheetTriggerAny: any = SheetPrimitive.Trigger;
const SheetOverlayAny: any = SheetPrimitive.Overlay;
const SheetContentAny: any = SheetPrimitive.Content;
const SheetTitleAny: any = SheetPrimitive.Title;
const SheetDescriptionAny: any = SheetPrimitive.Description;
const SheetClose = SheetPrimitive.Close;
const SheetCloseAny: any = SheetPrimitive.Close;

type SheetTriggerProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger> & { children?: React.ReactNode; className?: string; asChild?: boolean };
const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Trigger>,
  SheetTriggerProps
>((props, ref) => {
  const { children, className, ...rest } = props as SheetTriggerProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>, 'children' | 'className'>;
  return (
    <SheetTriggerAny ref={ref} {...restProps}>
      {children}
    </SheetTriggerAny>
  );
});
SheetTrigger.displayName = SheetPrimitive.Trigger.displayName;



const SheetPortal = SheetPrimitive.Portal;

type OverlayProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> & { className?: string; children?: React.ReactNode };
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  OverlayProps
>(({ className, ...props }, ref) => {
  const restProps = props as Omit<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>, 'children' | 'className'>;
  return (
    <SheetOverlayAny
      className={cn(
        "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...restProps}
      ref={ref}
    />
  );
});
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps extends React.PropsWithChildren<Record<string, unknown>>, VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  (props, ref) => {
    const { side = 'right', className, children, ...rest } = props as SheetContentProps & { className?: string };
    const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>, 'children' | 'className'> & { side?: 'top' | 'bottom' | 'left' | 'right' };
    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetContentAny ref={ref} className={cn(sheetVariants({ side: side as any }), className)} {...restProps}>
          {children}
          <SheetCloseAny className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetCloseAny>
        </SheetContentAny>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

type TitleProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> & { children?: React.ReactNode; className?: string };
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  TitleProps
>(({ className, ...props }, ref) => {
  const restProps = props as Omit<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>, 'children' | 'className'>;
  return <SheetTitleAny ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...restProps} />;
});
SheetTitle.displayName = SheetPrimitive.Title.displayName;

type DescProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description> & { children?: React.ReactNode; className?: string };
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  DescProps
>(({ className, ...props }, ref) => {
  const restProps = props as Omit<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>, 'children' | 'className'>;
  return <SheetDescriptionAny ref={ref} className={cn("text-sm text-muted-foreground", className)} {...restProps} />;
});
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
