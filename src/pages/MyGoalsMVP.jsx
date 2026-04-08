import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import { Loader2, Target } from "lucide-react";

// Reuse the existing GoalsSection component directly
const GoalsSection = lazy(() => import("@/components/performance/GoalsSection"));

export default function MyGoalsMVP() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-[#0202ff]" /> My Goals
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your leadership development goals.</p>
      </div>
      <FullAuthProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      }>
        <GoalsSection
          user={user}
          refreshTrigger={refreshTrigger}
          onRefresh={() => setRefreshTrigger(p => p + 1)}
        />
      </Suspense>
      </FullAuthProvider>
    </div>
  );
}