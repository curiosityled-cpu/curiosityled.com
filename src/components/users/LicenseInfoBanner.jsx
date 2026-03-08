import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function LicenseInfoBanner({ licenseInfo }) {
  if (!licenseInfo) return null;

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                License Usage {licenseInfo.client_name && `- ${licenseInfo.client_name}`}
                {licenseInfo.partner_name && `- ${licenseInfo.partner_name}`}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {licenseInfo.seats_used} of {licenseInfo.license_count} licenses used
                {licenseInfo.license_count > 0 && ` • ${licenseInfo.license_count - licenseInfo.seats_used} available`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{licenseInfo.seats_used}</p>
              <p className="text-xs text-blue-600">Active Users</p>
            </div>
            <div className="w-px h-10 bg-blue-300 mx-2"></div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">{licenseInfo.license_count - licenseInfo.seats_used}</p>
              <p className="text-xs text-blue-600">Available</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}