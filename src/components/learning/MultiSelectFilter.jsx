import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

export default function MultiSelectFilter({ title, options, selectedValues, onSelectionChange }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>{title}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        onSelectionChange(selectedValues.filter((v) => v !== option.value));
                      } else {
                        onSelectionChange([...selectedValues, option.value]);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        if (isSelected) {
                          onSelectionChange(selectedValues.filter((v) => v !== option.value));
                        } else {
                          onSelectionChange([...selectedValues, option.value]);
                        }
                      }}
                    />
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}