import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUSES = ["assigned", "started", "in_progress", "completed", "overdue"];
const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * Resource assignments — the resource half of "who owes what". Course assignments live
 * above it; both are the same question asked of a different kind of content.
 */
export default function ResourceAssignmentsPanel({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.AssignedLearning.filter(
        { client_id: user?.client_id },
        { sort: "-created_date", limit: 200 }
      );
      setAssignments(asArray(rows));
    } catch (error) {
      console.error("Could not load resource assignments", error);
      toast.error("Could not load resource assignments");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await base44.functions.invoke("listAllUsers");
      if (response.data?.success) setUsers(response.data.users || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    load();
    loadUsers();
  }, [user?.client_id]);

  const grouped = useMemo(() => {
    const groups = new Map();
    assignments.forEach((row) => {
      const key = row.learning_resource_id || "unknown";
      if (!groups.has(key)) groups.set(key, { title: row.title || "Untitled resource", items: [] });
      groups.get(key).items.push(row);
    });
    return [...groups.entries()];
  }, [assignments]);

  const nameOf = (email) => users.find((entry) => entry.email === email)?.full_name || email;

  const changeStatus = async (id, status) => {
    await base44.entities.AssignedLearning.update(id, { status });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Remove this assignment?")) return;
    await base44.entities.AssignedLearning.delete(id);
    toast.success("Assignment removed");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-600">No resource assignments yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Assign a resource from the Catalog to put it on someone's list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">
        {assignments.length} resource assignment{assignments.length === 1 ? "" : "s"}
      </p>
      {grouped.map(([resourceId, group]) => (
        <Card key={resourceId} className="border border-gray-100 shadow-sm rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0202ff]" /> {group.title}
              <Badge className="bg-gray-100 text-gray-600 text-[10px] ml-auto">
                {group.items.length} assigned
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {group.items.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{nameOf(row.user_email)}</p>
                  <p className="text-[11px] text-gray-500 truncate">{row.user_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={row.status} onValueChange={(value) => changeStatus(row.id, value)}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-600"
                    title="Remove assignment"
                    onClick={() => remove(row.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}