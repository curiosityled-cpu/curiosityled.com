import React from 'react';
import { Building2, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { useClient } from '@/components/contexts/ClientContext';

/**
 * Holds back a partner administrator's screens until they have chosen which
 * organisation they are working in. Nothing is loaded against a guessed tenant:
 * the server returns `needs_selection` and no active client for exactly this case.
 */
export default function ClientSelectionGate({ children }) {
  const { needsSelection, blockedReason, authorizedClients, selectClient, switching } = useClient();

  if (needsSelection) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0202ff]/10">
          <Building2 className="h-6 w-6 text-[#0202ff]" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Choose an organisation
        </h1>
        <p className="mb-8 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
          You oversee several organisations. Pick the one you want to work in; you can switch at any
          time from the header.
        </p>
        <div className="w-full space-y-2">
          {authorizedClients.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={switching}
              onClick={() => selectClient(option.id)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-[#0202ff]/40 hover:bg-[#0202ff]/5 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
            >
              <span>
                <span className="block font-semibold text-gray-900 dark:text-gray-100">
                  {option.name}
                </span>
                {option.slug && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{option.slug}</span>
                )}
              </span>
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // A partner whose portfolio resolved to nothing is not shown an empty app.
  if (blockedReason === 'TENANT_NOT_ASSIGNED' && !needsSelection) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          No organisation assigned
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account is not yet linked to an organisation. Ask your administrator to assign one.
        </p>
      </div>
    );
  }

  return children;
}