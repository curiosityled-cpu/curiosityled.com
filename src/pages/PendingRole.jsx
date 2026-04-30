import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingRole() {
  const { user } = useAuth();

  const handleLogout = () => base44.auth.logout();

  const firstName = user?.display_name?.split(" ")[0] ||
    user?.data?.display_name?.split(" ")[0] ||
    user?.full_name?.split(" ")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <img
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
        alt="Curiosity Led"
        className="w-14 h-14 object-contain mb-8"
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-7 h-7 text-[#0202ff]" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Welcome, {firstName}!
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your account has been created. An administrator will assign your role shortly — once that's done, you'll be able to access your personalised dashboard.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-8">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Waiting for role assignment…
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500 border-gray-300"
        >
          Sign out
        </Button>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Need help? Contact your administrator.
      </p>
    </div>
  );
}