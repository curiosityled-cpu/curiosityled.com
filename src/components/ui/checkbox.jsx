import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(checked || false);

  React.useEffect(() => {
    setIsChecked(checked || false);
  }, [checked]);

  const handleChange = (e) => {
    const newValue = e.target.checked;
    setIsChecked(newValue);
    if (onCheckedChange) {
      onCheckedChange(newValue);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        ref={ref}
        checked={isChecked}
        onChange={handleChange}
        className="sr-only peer"
        {...props}
      />
      <div
        onClick={() => {
          const newValue = !isChecked;
          setIsChecked(newValue);
          if (onCheckedChange) {
            onCheckedChange(newValue);
          }
        }}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          isChecked && "bg-blue-600 border-blue-600",
          className
        )}
      >
        {isChecked && (
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        )}
      </div>
    </div>
  );
});
Checkbox.displayName = "Checkbox"

export { Checkbox }