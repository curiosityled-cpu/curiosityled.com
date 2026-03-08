import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function LearningResourceComboBox({ value, onValueChange, placeholder = "Select learning resource...", filterByCompetency = null }) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadResources();
  }, [filterByCompetency]);

  const loadResources = async () => {
    setLoading(true);
    try {
      let allResources = await base44.entities.LearningResource.filter({ is_active: true });
      
      if (filterByCompetency) {
        allResources = allResources.filter(r => 
          r.competencies && r.competencies.includes(filterByCompetency)
        );
      }

      setResources(allResources);
    } catch (error) {
      console.error('Error loading resources:', error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedResource = resources.find(r => r.id === value);

  const filteredResources = resources.filter(resource => {
    const searchLower = searchQuery.toLowerCase();
    return (
      resource.title?.toLowerCase().includes(searchLower) ||
      resource.description?.toLowerCase().includes(searchLower) ||
      resource.type?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedResource ? (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{selectedResource.title}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search resources..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading resources..." : "No resources found."}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredResources.map((resource) => (
                <CommandItem
                  key={resource.id}
                  onSelect={() => {
                    onValueChange(resource.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === resource.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{resource.title}</span>
                    <span className="text-xs text-gray-500">{resource.type}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}