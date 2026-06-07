import React from "react";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import GoalsAndOKRsTab from "@/components/performance-mgmt/GoalsAndOKRsTab";

export default function MyPerformance() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <MVPPageLayout title="My Goals" subtitle="Track your goals and personal development">
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="My Goals"
      subtitle="Track your goals and personal development"
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        <GoalsAndOKRsTab user={user} />
      </motion.div>
    </MVPPageLayout>
  );
}