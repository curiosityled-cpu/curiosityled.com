import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, MessageSquare, AtSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";

export default function TaskCommentsModal({ isOpen, onClose, task }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isOpen && task) {
      loadComments();
    }
  }, [isOpen, task]);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const taskComments = await base44.entities.Comment.filter(
        { item_id: task.id },
        "-created_date"
      );
      setComments(taskComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
    setIsLoading(false);
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\S+@\S+\.\S+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    const mentions = extractMentions(newComment);

    try {
      const comment = await base44.entities.Comment.create({
        content: newComment,
        item_id: task.id,
        user_email: user.email,
        user_name: user.full_name,
        mentions
      });

      // Update task comments count
      await base44.entities.Item.update(task.id, {
        comments_count: (task.comments_count || 0) + 1
      });

      // Create notifications for mentions
      for (const mentionedEmail of mentions) {
        await base44.entities.Notification.create({
          user_email: mentionedEmail,
          type: "1on1_scheduled",
          title: "Mentioned in Task",
          message: `${user.full_name} mentioned you in "${task.title}"`,
          related_entity_type: "Item",
          related_entity_id: task.id,
          priority: "medium"
        });
      }

      // Notify assignees
      if (task.assignees?.length > 0) {
        for (const assignee of task.assignees) {
          if (assignee.user_email !== user.email) {
            await base44.entities.Notification.create({
              user_email: assignee.user_email,
              type: "1on1_scheduled",
              title: "New Comment on Task",
              message: `${user.full_name} commented on "${task.title}"`,
              related_entity_type: "Item",
              related_entity_id: task.id,
              priority: "low"
            });
          }
        }
      }

      setComments([comment, ...comments]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const renderCommentContent = (content) => {
    const parts = content.split(/(@\S+@\S+\.\S+)/g);
    return parts.map((part, index) => {
      if (part.match(/^@\S+@\S+\.\S+$/)) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">Comments</h3>
              <p className="text-sm text-gray-500">{task?.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{comment.user_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renderCommentContent(comment.content)}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment... Use @email to mention someone"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                <AtSign className="w-3 h-3 inline mr-1" />
                Use @email to mention team members
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim()}
              className="bg-[#0073EA] hover:bg-[#0056B3] self-start"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}