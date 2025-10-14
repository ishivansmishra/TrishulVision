import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
// Augmented aliases: extend primitive prop types to include optional children and className so JSX usage is accepted by TS
// Minimal any-casts for JSX usage (keeps wrapper prop types strict while satisfying TSX)
const TriggerAny: any = DropdownMenuPrimitive.Trigger;
const SubTriggerAny: any = DropdownMenuPrimitive.SubTrigger;
const SubContentAny: any = DropdownMenuPrimitive.SubContent;
const ContentAny: any = DropdownMenuPrimitive.Content;
const ItemAny: any = DropdownMenuPrimitive.Item;
const CheckboxItemAny: any = DropdownMenuPrimitive.CheckboxItem;
const RadioItemAny: any = DropdownMenuPrimitive.RadioItem;
const LabelAny: any = DropdownMenuPrimitive.Label;
const SeparatorAny: any = DropdownMenuPrimitive.Separator;
const DropdownMenuItemIndicator = DropdownMenuPrimitive.ItemIndicator as unknown as React.ComponentType<React.PropsWithChildren<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.ItemIndicator>>>;

type TriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> & { children?: React.ReactNode; className?: string; asChild?: boolean };
const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  TriggerProps
>((props, ref) => {
  const { children, className, ...rest } = props as TriggerProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>, 'children' | 'className'>;
  return (
    <TriggerAny ref={ref} {...restProps}>
      {children}
    </TriggerAny>
  );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

type SubTriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { children?: React.ReactNode; inset?: boolean; className?: string };
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  SubTriggerProps
>((props, ref) => {
  const { className, inset, children, ...rest } = props as SubTriggerProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>, 'children' | 'className'>;
  return (
    <SubTriggerAny
      ref={ref}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[state=open]:bg-accent focus:bg-accent",
        inset && "pl-8",
        className,
      )}
      {...restProps}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </SubTriggerAny>
  );
});
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

type SubContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> & { children?: React.ReactNode; className?: string };
const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  SubContentProps
>((props, ref) => {
  const { className, ...rest } = props as SubContentProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>, 'children' | 'className'>;
  return (
    <SubContentAny
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...restProps}
    />
  );
});
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

type ContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & { children?: React.ReactNode; className?: string };
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  ContentProps
>((props, ref) => {
  const { className, sideOffset = 4, ...rest } = props as ContentProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>, 'children' | 'className'>;
  return (
    <DropdownMenuPrimitive.Portal>
      <ContentAny
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...restProps}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { children?: React.ReactNode; inset?: boolean; className?: string; onClick?: React.MouseEventHandler };
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  ItemProps
>((props, ref) => {
  const { className, inset, onClick, ...rest } = props as ItemProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>, 'children' | 'className' | 'onClick'>;
  return (
    <ItemAny
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        className,
      )}
      onSelect={(e: any) => {
        // call original onSelect if provided
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        (restProps as any).onSelect?.(e);
        onClick?.(e as unknown as any);
      }}
      {...restProps}
    />
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

type CheckboxItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & { children?: React.ReactNode; className?: string };
const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  CheckboxItemProps
>((props, ref) => {
  const { className, children, ...rest } = props as CheckboxItemProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>, 'children' | 'className'>;
      return (
        <CheckboxItemAny
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      {...restProps}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuItemIndicator>
          <Check className="h-4 w-4" />
        </DropdownMenuItemIndicator>
      </span>
      {children}
        </CheckboxItemAny>
  );
});
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

type RadioItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & { children?: React.ReactNode; className?: string };
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  RadioItemProps
>((props, ref) => {
  const { className, children, ...rest } = props as RadioItemProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>, 'children' | 'className'>;
      return (
        <RadioItemAny
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      {...restProps}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </DropdownMenuItemIndicator>
      </span>
      {children}
        </RadioItemAny>
  );
});
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

type LabelProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean; className?: string; children?: React.ReactNode };
const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  LabelProps
>((props, ref) => {
  const { className, inset, ...rest } = props as LabelProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>, 'children' | 'className'>;
  return (
    <LabelAny ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...restProps}>
      {(props as any).children}
    </LabelAny>
  );
});
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

type SeparatorProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> & { className?: string };
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  SeparatorProps
>((props, ref) => {
  const { className, ...rest } = props as SeparatorProps;
  const restProps = rest as Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>, 'children' | 'className'>;
      return <SeparatorAny ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...restProps} />;
});
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
