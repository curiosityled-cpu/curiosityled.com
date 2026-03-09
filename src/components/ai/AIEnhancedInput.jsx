import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { useAIFieldSuggestions } from './useAIFieldSuggestions';
import AIFieldSuggestionsDropdown from './AIFieldSuggestionsDropdown';
import { cn } from '@/lib/utils';

/**
 * Enhanced input component with AI suggestions
 * Works with both Input and Textarea
 */
export default function AIEnhancedInput({
  value,
  onChange,
  fieldName,
  fieldType = 'text',
  formContext = {},
  historicalData = [],
  multiline = false,
  aiEnabled = true,
  placeholder,
  className,
  ...props
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const {
    suggestions,
    loading,
    getSuggestions,
    clearSuggestions
  } = useAIFieldSuggestions({
    fieldName,
    fieldType,
    formContext,
    historicalData,
    minChars: 3,
    debounceMs: 600
  });

  useEffect(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    setHasInteracted(true);

    if (aiEnabled && newValue && newValue.length >= 3) {
      getSuggestions(newValue);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    // Create synthetic event
    const syntheticEvent = {
      target: {
        value: suggestion,
        name: inputRef.current?.name
      }
    };
    onChange(syntheticEvent);
    setShowSuggestions(false);
    clearSuggestions();
    
    // Return focus to input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleFocus = () => {
    if (value && value.length >= 3 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const Component = multiline ? Textarea : Input;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Component
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            aiEnabled && hasInteracted && "pr-10",
            className
          )}
          {...props}
        />
        
        {/* AI indicator */}
        {aiEnabled && hasInteracted && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Sparkles 
              className={cn(
                "w-4 h-4 transition-colors",
                loading ? "text-purple-600 animate-pulse" : 
                suggestions.length > 0 ? "text-purple-600" : 
                "text-gray-300"
              )} 
            />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {aiEnabled && showSuggestions && (
        <AIFieldSuggestionsDropdown
          suggestions={suggestions}
          loading={loading}
          onSelect={handleSuggestionSelect}
          onDismiss={() => {
            setShowSuggestions(false);
            clearSuggestions();
          }}
          anchorRef={inputRef}
        />
      )}
    </div>
  );
}