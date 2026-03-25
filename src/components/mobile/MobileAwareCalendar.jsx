import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MobileAwareCalendar({
  selected,
  onSelect,
  disabled,
  children,
  buttonClassName,
  placeholder,
  mode,
  ...calendarProps
}) {
  const resolvedPlaceholder = placeholder || "Select date";
  const resolvedMode = mode || "single";
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelect = (date) => {
    onSelect?.(date);
    setOpen(false);
  };

  const triggerButton = children || (
    <Button variant="outline" className={cn("w-full justify-start text-left", buttonClassName)}>
      <CalendarIcon className="w-4 h-4 mr-2" />
      {selected ? format(selected, 'PPP') : resolvedPlaceholder}
    </Button>
  );

  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode={resolvedMode} selected={selected} onSelect={handleSelect} disabled={disabled} initialFocus {...calendarProps} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Select Date</DrawerTitle>
        </DrawerHeader>
        <div className="flex justify-center px-4 pb-4">
          <Calendar mode={resolvedMode} selected={selected} onSelect={handleSelect} disabled={disabled} {...calendarProps} />
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}