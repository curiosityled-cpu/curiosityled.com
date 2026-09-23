import React from "react";
import { Link } from "react-router-dom";
import { Network, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * SuccessionLaunchCard — launch card for the Succession module.
 * Embedded in Talent Manager; navigates to /succession.
 */
export default function SuccessionLaunchCard() {
  return (
    <Card className="border border-gray-200 bg-white overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row items-start gap-5 p-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0202ff]/10 flex items-center justify-center">
            <Network className="w-6 h-6 text-[#0202ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Succession Management</h3>
            <p className="text-sm text-gray-500 mt-1">
              Frame critical roles, discover and develop successors, calibrate readiness with
              human-led governance, and manage transitions — all with strict tenant isolation and
              immutable, versioned readiness decisions.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">
                Phase 0 architecture is initialized — domain features arrive in later phases.
              </span>
            </div>
          </div>
          <Link
            to="/succession"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: "#0202ff" }}
          >
            Open Succession
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}