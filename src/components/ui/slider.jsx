import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ 
  className, 
  min = 0, 
  max = 100, 
  step = 1, 
  value = [0], 
  onValueChange,
  disabled = false,
  ...props 
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(value[0] || 0);

  React.useEffect(() => {
    setInternalValue(value[0] || 0);
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value);
    setInternalValue(newValue);
    if (onValueChange) {
      onValueChange([newValue]);
    }
  };

  const percentage = ((internalValue - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex items-center w-full", className)} ref={ref}>
      <div className="relative w-full h-2 bg-slate-200 rounded-full">
        <div 
          className="absolute h-full bg-blue-600 rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={internalValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "absolute inset-0 w-full h-2 opacity-0 cursor-pointer",
            disabled && "cursor-not-allowed"
          )}
          {...props}
        />
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md transition-all duration-150",
            disabled && "bg-slate-100 border-slate-300"
          )}
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider }