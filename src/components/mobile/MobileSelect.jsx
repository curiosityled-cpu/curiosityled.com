import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile-responsive Select that uses Drawer on small screens
 * and standard Select on larger screens
 */
export default function MobileSelect({ 
  value, 
  onValueChange, 
  placeholder, 
  options = [], 
  children,
  className,
  triggerClassName
}) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Desktop: use standard Select
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("select-none", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="select-none">
          {children || options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="select-none">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: use Drawer
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("w-full justify-start select-none", triggerClassName)}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="select-none">
        <DrawerHeader>
          <DrawerTitle>{placeholder}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
          {children || options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition-colors select-none active:bg-gray-100",
                value === option.value 
                  ? "bg-blue-50 text-blue-600 font-medium" 
                  : "hover:bg-gray-50"
              )}
            >
              <span>{option.label}</span>
              {value === option.value && <Check className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}