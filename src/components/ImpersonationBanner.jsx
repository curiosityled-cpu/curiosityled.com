import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, LogOut, AlertCircle } from "lucide-react";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ImpersonationBanner() {
  const { impersonation, exitImpersonation, reloadUser } = useAuth();
  const [exiting, setExiting] = React.useState(false);

  if (!impersonation) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      const result = await exitImpersonation();
      if (result.success) {
        toast.success('Returned to admin account');
        await reloadUser();
        window.location.reload(); // Force full reload to reset state
      } else {
        toast.error('Failed to exit impersonation');
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error);
      toast.error('Failed to exit impersonation');
    } finally {
      setExiting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 left-0 right-0 z-50"
    >
      <Alert className="rounded-none border-0 border-b-4 border-orange-500 bg-gradient-to-r from-orange-50 to-red-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center animate-pulse">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <AlertDescription className="font-semibold text-orange-900">
                      Impersonation Mode Active
                    </AlertDescription>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    You are viewing as <strong>{impersonation.target_name || impersonation.target_email}</strong>
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="bg-white text-orange-800 border-orange-300">
                  <Eye className="w-3 h-3 mr-1" />
                  Viewing as {impersonation.target_role}
                </Badge>
                <Badge variant="outline" className="bg-white text-blue-800 border-blue-300">
                  Admin: {impersonation.admin_name}
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleExit}
              disabled={exiting}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-orange-50 border-orange-300 text-orange-900 font-semibold"
            >
              {exiting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-orange-900 border-t-transparent rounded-full animate-spin"></div>
                  Exiting...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Exit Impersonation
                </>
              )}
            </Button>
          </div>
        </div>
      </Alert>
    </motion.div>
  );
}