import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import { Loader2, Target } from "lucide-react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

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
    <MVPPageLayout
      title="My Goals"
      subtitle="Track and manage your leadership development goals."
    >
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
    </MVPPageLayout>
  );
}