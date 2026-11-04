import React from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useClient } from '@/components/contexts/ClientContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Lets a partner administrator move between the organisations they oversee.
 * The list and the permission both come from the server resolver; this only
 * offers the choice, it never decides it.
 */
export default function ClientSwitcher() {
  const { authorizedClients, authorizedClientIds, canSelectClient, client, selectClient, switching } =
    useClient();

  const options = authorizedClients.length
    ? authorizedClients
    : authorizedClientIds.map((id) => ({ id, name: id }));

  if (!canSelectClient || options.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-label="Switch organisation"
        >
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Building2 className="h-4 w-4 text-gray-400" />
          )}
          <span className="max-w-[160px] truncate">{client?.name || 'Select organisation'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your organisations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const active = option.id === client?.id;
          return (
            <DropdownMenuItem
              key={option.id}
              disabled={switching}
              onSelect={() => selectClient(option.id)}
              className="cursor-pointer"
            >
              <span className="flex-1 truncate">{option.name}</span>
              {active && <Check className="ml-2 h-4 w-4 text-[#0202ff]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}