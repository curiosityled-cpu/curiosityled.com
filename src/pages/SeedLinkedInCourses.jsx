import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Linkedin } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SeedLinkedInCourses() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  const runSeed = async () => {
    setStatus("running");
    setCount(0);
    try {
      const response = await base44.functions.invoke("seedLinkedInCourses", {});
      const data = response.data;
      if (data.skipped) {
        setMessage(data.message);
      } else {
        setMessage(`Successfully seeded ${data.created} LinkedIn Learning courses.`);
        setCount(data.created);
      }
      setStatus("done");
    } catch (e) {
      setMessage(`Error: ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
            Seed LinkedIn Learning Courses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This will create 30 LinkedIn Learning courses across 12 competency areas
            into the LearningResource library. Run once only.
          </p>
          {message && (
            <div className={`p-3 rounded-lg text-sm ${status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
          {status === "running" && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating courses...
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Done!
            </div>
          )}
          <Button
            className="w-full bg-[#0077b5] hover:bg-[#006396] text-white"
            onClick={runSeed}
            disabled={status === "running" || status === "done"}
          >
            {status === "running" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Seeded</>
            ) : (
              "Run Seed"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}