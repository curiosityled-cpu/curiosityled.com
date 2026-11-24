import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { openResource } from "@/lib/openResource";

/**
 * Opening and completing a learner's work items — one implementation shared by
 * the learning shelf, so a course, resource and conversation all behave the same.
 */
export default function useLearnerActions({ onChanged } = {}) {
  const navigate = useNavigate();
  const { openWithContext } = useAtreusChat();
  const [busyId, setBusyId] = useState(null);

  const open = async (item) => {
    // Conversational modules run in the Atreus panel, same as a course lesson.
    if (item.launch?.module) {
      openWithContext({
        context: {
          pageType: "conversational_module",
          module_id: item.launch.module.id,
          learning_module_mode: true,
          module_data: item.launch.module,
        },
      });
      if (item.status !== "completed" && item.refId) {
        base44.entities.AssignedLearning.update(item.refId, { status: "in_progress" })
          .then(onChanged)
          .catch(() => {});
      }
      return;
    }
    if (item.launch?.to) {
      navigate(item.launch.to);
      return;
    }
    if (item.launch?.resource) {
      const opened = await openResource(item.launch.resource);
      if (!opened) {
        toast.info("This resource has no link or file attached yet.");
      } else if (item.status !== "completed" && item.refId) {
        await base44.entities.AssignedLearning.update(item.refId, { status: "in_progress" });
        await onChanged?.();
      }
    }
  };

  const markComplete = async (item) => {
    setBusyId(item.id);
    try {
      await base44.entities.AssignedLearning.update(item.refId, {
        status: "completed",
        completion_date: new Date().toISOString(),
      });
      toast.success("Marked complete");
      await onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("Could not update this item");
    } finally {
      setBusyId(null);
    }
  };

  return { open, markComplete, busyId };
}