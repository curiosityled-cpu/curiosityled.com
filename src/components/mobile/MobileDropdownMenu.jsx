import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Mobile-responsive DropdownMenu that uses Drawer on small screens
 * and standard DropdownMenu on larger screens
 */
export default function MobileDropdownMenu({ 
  trigger, 
  title,
  children,
  align = "end"
}) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Desktop: use standard DropdownMenu
  if (!isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="select-none">
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="select-none">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Mobile: use Drawer
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild className="select-none">
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="select-none">
        {title && (
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
        )}
        <div className="px-4 pb-8 max-h-[70vh] overflow-y-auto">
          {React.Children.map(children, (child) => {
            if (!child) return null;
            
            // Handle separators
            if (child.type === DropdownMenuSeparator || child.type?.displayName === 'DropdownMenuSeparator') {
              return <div className="border-t my-2" />;
            }
            
            // Handle labels
            if (child.type === DropdownMenuLabel || child.type?.displayName === 'DropdownMenuLabel') {
              return (
                <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                  {child.props.children}
                </div>
              );
            }
            
            // Handle menu items
            if (child.type === DropdownMenuItem || child.type?.displayName === 'DropdownMenuItem') {
              return (
                <button
                  onClick={(e) => {
                    if (child.props.onClick) {
                      child.props.onClick(e);
                    }
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 rounded-lg mb-1 transition-colors select-none active:bg-gray-100",
                    child.props.className,
                    "hover:bg-gray-50"
                  )}
                >
                  {child.props.children}
                </button>
              );
            }
            
            return child;
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Export convenience components for mobile-aware wrappers
export { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel };