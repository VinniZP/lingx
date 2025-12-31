"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon, Command as CommandIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 gap-0 rounded-2xl border-border/50 shadow-2xl shadow-black/20 dark:shadow-black/50",
          "bg-gradient-to-b from-card to-card/95 backdrop-blur-xl",
          "max-w-lg w-[95vw] sm:w-full",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200",
          className
        )}
        showCloseButton={showCloseButton}
      >
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:ring-0 [&_[cmdk-input]]:border-0 [&_[cmdk-input]]:shadow-none [&_[cmdk-input]:focus]:outline-none [&_[cmdk-input]:focus]:ring-0">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-14 items-center gap-3 border-b border-border/40 px-4 bg-muted/30 [&:has(input:focus)]:outline-none"
    >
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
        <CommandIcon className="size-4" />
      </div>
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-14 w-full bg-transparent text-[15px] font-medium",
          "!outline-none !ring-0 !border-0 !shadow-none",
          "focus:!outline-none focus:!ring-0 focus:!border-0 focus:!shadow-none",
          "focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!border-0",
          "placeholder:text-muted-foreground/50 placeholder:font-normal",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&]:outline-none [&]:ring-0",
          className
        )}
        {...props}
      />
      <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 font-kbd text-[10px] font-medium text-muted-foreground/70">
        ESC
      </kbd>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[320px] scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain",
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-12 text-center"
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center">
          <SearchIcon className="size-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">No results found</p>
        <p className="text-xs text-muted-foreground/60">Try a different search term</p>
      </div>
    </CommandPrimitive.Empty>
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground overflow-hidden py-2",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border/40 -mx-2 my-2 h-px", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-3 rounded-xl mx-2 px-3 py-2.5 text-sm outline-none select-none",
        "transition-all duration-150 ease-out",
        "data-[selected=true]:bg-primary/8 data-[selected=true]:text-foreground",
        "data-[selected=true]:shadow-sm data-[selected=true]:shadow-primary/5",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='text-'])]:text-muted-foreground/70",
        "[&_svg:not([class*='size-'])]:size-[18px]",
        "group",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto inline-flex items-center",
        "text-muted-foreground/70 group-data-[selected=true]:text-muted-foreground",
        "font-kbd text-xs tracking-wide",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
