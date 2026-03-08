import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ConversationPagination({ conversationId, currentMessageCount, onLoadMore }) {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadOlderMessages = async () => {
    if (!conversationId || loading || !hasMore) return;

    setLoading(true);
    try {
      const conversations = await base44.entities.Conversation.filter({ id: conversationId });
      
      if (conversations.length === 0) {
        toast.error('Conversation not found');
        setHasMore(false);
        return;
      }

      const allMessages = conversations[0].messages || [];
      
      if (allMessages.length <= currentMessageCount) {
        setHasMore(false);
        toast.info('All messages loaded');
        return;
      }

      // Load next batch (50 messages)
      const startIndex = Math.max(0, allMessages.length - currentMessageCount - 50);
      const endIndex = allMessages.length - currentMessageCount;
      const olderMessages = allMessages.slice(startIndex, endIndex);

      onLoadMore(olderMessages);
      
      if (startIndex === 0) {
        setHasMore(false);
      }

      toast.success(`Loaded ${olderMessages.length} older messages`);
    } catch (error) {
      console.error('Error loading older messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      setLoading(false);
    }
  };

  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={loadOlderMessages}
        disabled={loading}
        className="text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronUp className="w-3 h-3 mr-2" />
            Load Older Messages
          </>
        )}
      </Button>
    </div>
  );
}