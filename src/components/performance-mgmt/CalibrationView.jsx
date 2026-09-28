import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scale, Play, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RATING_OPTIONS = [
  { value: "5", label: "5 — Exceeds" },
  { value: "4", label: "4 — Meets" },
  { value: "3", label: "3 — Partially" },
  { value: "2", label: "2 — Below" },
  { value: "1", label: "1 — Far Below" },
];

function RatingCell({ value }) {
  if (value == null) return <span className="text-gray-300 text-xs">—</span>;
  const color = value >= 4 ? "text-green-600" : value >= 3 ? "text-amber-600" : "text-red-600";
  return <span className={`text-sm font-medium ${color}`}>{value}</span>;
}

function EmployeeCalibrationRow({ employee, index, onAdjust }) {
  const [adjustedRating, setAdjustedRating] = useState(String(employee.calibrated_rating || ""));
  const [reason, setReason] = useState(employee.adjustment_reason || "");
  const isAdjusted = employee.calibrated_rating != null && employee.manager_rating != null && employee.calibrated_rating !== employee.manager_rating;

  const handleRatingChange = (val) => {
    setAdjustedRating(val);
    onAdjust(employee.employee_email, parseInt(val), reason);
  };

  const handleReasonChange = (val) => {
    setReason(val);
    if (adjustedRating) onAdjust(employee.employee_email, parseInt(adjustedRating), val);
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className={`hover:bg-gray-50 ${isAdjusted ? "bg-amber-50/40" : ""}`}
    >
      <td className="px-3 py-2">
        <p className="font-medium text-gray-900 text-xs">{employee.employee_name || employee.employee_email}</p>
        <p className="text-[10px] text-gray-400">{employee.employee_email}</p>
      </td>
      <td className="px-3 py-2 text-center"><RatingCell value={employee.manager_rating} /></td>
      <td className="px-3 py-2 text-center"><RatingCell value={employee.self_rating} /></td>
      <td className="px-3 py-2 text-center"><RatingCell value={employee.peer_avg_rating} /></td>
      <td className="px-3 py-2">
        <Select value={adjustedRating} onValueChange={handleRatingChange}>
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {RATING_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input
          placeholder="Reason for adjustment..."
          value={reason}
          onChange={(e) => handleReasonChange(e.target.value)}
          className="h-7 text-xs"
          disabled={!adjustedRating || adjustedRating === String(employee.manager_rating)}
        />
      </td>
      <td className="px-3 py-2 text-center">
        {isAdjusted ? (
          employee.calibrated_rating > employee.manager_rating ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-500 mx-auto" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500 mx-auto" />
          )
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 mx-auto" />
        )}
      </td>
    </motion.tr>
  );
}

export default function CalibrationView({ cycle, user }) {
  const [calibration, setCalibration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [adjustments, setAdjustments] = useState({});

  const loadCalibration = async () => {
    setLoading(true);
    try {
      const existing = await base44.entities.ReviewCalibration.filter({
        review_cycle_id: cycle.id,
        client_id: user.client_id || user.data?.client_id,
      }, "-created_date");
      if (existing.length > 0) {
        setCalibration(existing[0]);
        // Pre-populate adjustments from existing data
        const adjMap = {};
        (existing[0].calibrated_employees || []).forEach((e) => {
          if (e.calibrated_rating != null && e.calibrated_rating !== e.manager_rating) {
            adjMap[e.employee_email] = {
              calibrated_rating: e.calibrated_rating,
              adjustment_reason: e.adjustment_reason || "",
            };
          }
        });
        setAdjustments(adjMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCalibration(); }, [cycle.id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await base44.functions.invoke("startReviewCalibration", {
        review_cycle_id: cycle.id,
      });
      setCalibration(res.data.calibration);
      toast.success(`Calibration started — ${res.data.employees.length} employees`);
    } catch (err) {
      toast.error("Failed to start calibration: " + (err.message || "Unknown error"));
    } finally {
      setStarting(false);
    }
  };

  const handleAdjust = (email, rating, reason) => {
    setAdjustments(prev => ({
      ...prev,
      [email]: { calibrated_rating: rating, adjustment_reason: reason },
    }));
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const adjustedEmployees = Object.entries(adjustments).map(([email, adj]) => ({
        employee_email: email,
        calibrated_rating: adj.calibrated_rating,
        adjustment_reason: adj.adjustment_reason,
      }));

      const res = await base44.functions.invoke("finalizeReviewCalibration", {
        calibration_id: calibration.id,
        adjusted_employees: adjustedEmployees,
      });
      setCalibration(res.data.calibration);
      toast.success(`Calibration finalized — ${res.data.adjusted_count} ratings adjusted`);
    } catch (err) {
      toast.error("Failed to finalize: " + (err.message || "Unknown error"));
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>;
  }

  // No calibration yet — show start button
  if (!calibration) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
        <Scale className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No calibration session for this cycle</p>
        <p className="text-xs text-gray-400 mt-1 mb-4">Start calibration to aggregate and align ratings across the organization</p>
        <Button onClick={handleStart} disabled={starting} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start Calibration
        </Button>
      </div>
    );
  }

  const employees = calibration.calibrated_employees || [];
  const isCompleted = calibration.status === "completed";
  const adjustedCount = Object.keys(adjustments).length;

  // Summary stats
  const mgrRatings = employees.filter(e => e.manager_rating != null).map(e => e.manager_rating);
  const avgMgr = mgrRatings.length > 0 ? (mgrRatings.reduce((a, b) => a + b, 0) / mgrRatings.length).toFixed(1) : "—";
  const withMgr = employees.filter(e => e.manager_rating != null).length;
  const withSelf = employees.filter(e => e.self_rating != null).length;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <Badge variant="outline" className={`border ${isCompleted ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
          {isCompleted ? "Completed" : "Active"}
        </Badge>
        <span className="text-gray-500">{employees.length} employees</span>
        <span className="text-gray-500">{withMgr} with manager review</span>
        <span className="text-gray-500">{withSelf} with self-assessment</span>
        <span className="text-gray-500">Avg Mgr: <strong className="text-gray-700">{avgMgr}</strong></span>
        {!isCompleted && adjustedCount > 0 && (
          <span className="text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {adjustedCount} pending adjustments
          </span>
        )}
      </div>

      {/* Calibration table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Employee</th>
                <th className="text-center px-3 py-2 font-medium">Mgr Rating</th>
                <th className="text-center px-3 py-2 font-medium">Self Rating</th>
                <th className="text-center px-3 py-2 font-medium">Peer Avg</th>
                <th className="text-left px-3 py-2 font-medium">Calibrated</th>
                <th className="text-left px-3 py-2 font-medium">Adjustment Reason</th>
                <th className="text-center px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-400">No submissions to calibrate</td></tr>
              ) : (
                employees.map((emp, i) => (
                  <EmployeeCalibrationRow
                    key={emp.employee_email}
                    employee={emp}
                    index={i}
                    onAdjust={isCompleted ? () => {} : handleAdjust}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finalize button */}
      {!isCompleted && employees.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleFinalize}
            disabled={finalizing}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Finalize Calibration
          </Button>
        </div>
      )}

      {isCompleted && calibration.summary_stats && (
        <Card className="border border-green-100 bg-green-50/50 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Calibration Complete</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Total Employees</p>
                <p className="text-lg font-bold text-gray-900">{calibration.summary_stats.total_employees}</p>
              </div>
              <div>
                <p className="text-gray-500">Ratings Adjusted</p>
                <p className="text-lg font-bold text-amber-600">{calibration.summary_stats.adjusted_count}</p>
              </div>
              <div>
                <p className="text-gray-500">Avg Calibrated Rating</p>
                <p className="text-lg font-bold text-gray-900">{calibration.summary_stats.avg_calibrated_rating || "—"}</p>
              </div>
            </div>
            {calibration.completed_by_email && (
              <p className="text-[10px] text-gray-400 mt-2">
                Finalized by {calibration.completed_by_email} on {calibration.completed_at ? new Date(calibration.completed_at).toLocaleDateString() : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}