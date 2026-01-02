"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          // Base styling - premium island appearance
          "z-50 min-w-[12rem] overflow-hidden rounded-xl border bg-card p-1.5",
          // Premium shadow - matches island styling
          "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]",
          // Animations - smooth and premium
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // Size constraints
          "max-h-(--radix-dropdown-menu-content-available-height)",
          "origin-(--radix-dropdown-menu-content-transform-origin)",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // Base styling - h-10 (40px) for comfortable touch targets
        "relative flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-hidden select-none",
        // Transitions
        "transition-colors duration-150",
        // Default state
        "text-foreground",
        // Focus/hover state - subtle background
        "focus:bg-accent/50 hover:bg-accent/50",
        // Destructive variant
        "data-[variant=destructive]:text-destructive",
        "data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:hover:bg-destructive/10",
        "dark:data-[variant=destructive]:focus:bg-destructive/20 dark:data-[variant=destructive]:hover:bg-destructive/20",
        "data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:hover:text-destructive",
        // Icon styling
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "data-[variant=destructive]:*:[svg]:!text-destructive",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        // Disabled state
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Inset for items with indicators
        "data-[inset]:pl-9",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-lg py-2.5 pr-3 pl-9 text-sm font-medium outline-hidden select-none",
        "transition-colors duration-150",
        "focus:bg-accent/50 hover:bg-accent/50",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-lg py-2.5 pr-3 pl-9 text-sm font-medium outline-hidden select-none",
        "transition-colors duration-150",
        "focus:bg-accent/50 hover:bg-accent/50",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-primary text-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        "data-[inset]:pl-9",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1.5 my-1.5 h-px", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs font-medium tracking-widest text-muted-foreground/70",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-hidden select-none",
        "transition-colors duration-150",
        "focus:bg-accent/50 hover:bg-accent/50",
        "data-[state=open]:bg-accent/50",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        "data-[inset]:pl-9",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4 text-muted-foreground/70" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-xl border bg-card p-1.5",
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        "origin-(--radix-dropdown-menu-content-transform-origin)",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
