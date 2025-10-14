import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

// Tabs wrapper that ensures children are accepted and props are forwarded (permissive)
const Tabs: React.FC<any> = ({ children, ...props }) => (
  // forward all props to Radix Tabs root; cast to any to avoid strict prop typing
  <TabsPrimitive.Root {...(props as any)}>
    {children}
  </TabsPrimitive.Root>
);

// Use Any aliases to avoid TSX children/prop-intrinsic typing mismatches in wrapper
const TabsListAny: any = TabsPrimitive.List as any;
const TabsTriggerAny: any = TabsPrimitive.Trigger as any;
const TabsContentAny: any = TabsPrimitive.Content as any;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.PropsWithChildren<any>
>(({ className, ...props }, ref) => (
  <TabsListAny
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...(props as any)}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.PropsWithChildren<any>
>(({ className, ...props }, ref) => (
  <TabsTriggerAny
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...(props as any)}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.PropsWithChildren<any>
>(({ className, ...props }, ref) => (
  <TabsContentAny
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...(props as any)}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
