import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone } from "lucide-react";

export default function ResponsivePreview({ form }) {
  const [device, setDevice] = useState("desktop");

  const deviceSizes = {
    desktop: { width: "100%", height: "600px" },
    tablet: { width: "768px", height: "1024px" },
    mobile: { width: "375px", height: "667px" }
  };

  const previewUrl = `${window.location.origin}/PublicFormSubmission?formId=${form.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {device === "desktop" && <Monitor className="w-5 h-5" />}
            {device === "tablet" && <Tablet className="w-5 h-5" />}
            {device === "mobile" && <Smartphone className="w-5 h-5" />}
            Responsive Preview
          </span>
          <div className="flex gap-2">
            <Button
              variant={device === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={device === "tablet" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={device === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 p-4 rounded-lg flex justify-center">
          <div
            style={{
              width: deviceSizes[device].width,
              height: deviceSizes[device].height,
              maxWidth: "100%",
              transition: "all 0.3s ease"
            }}
            className="bg-white rounded-lg shadow-xl overflow-hidden"
          >
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Form Preview"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Preview your form on different devices
        </p>
      </CardContent>
    </Card>
  );
}