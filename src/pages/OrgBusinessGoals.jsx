import React from "react";
import { useAuth } from "@/components/useAuth";
import OrgBusinessGoalManager from "@/components/dashboard/admin/OrgBusinessGoalManager";
import { Building2 } from "lucide-react";

export default function OrgBusinessGoals() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organizational Business Goals</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure goals shown to all users in their Insights page</p>
          </div>
        </div>
        <OrgBusinessGoalManager user={user} />
      </div>
    </div>
  );
}