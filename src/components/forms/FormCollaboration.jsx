import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FormCollaboration({ form, onUpdate }) {
  const [comments, setComments] = useState(form.config?.collaboration_comments || []);
  const [newComment, setNewComment] = useState({
    text: "",
    question_id: null,
    is_resolved: false
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.text.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      const comment = {
        id: `comment_${Date.now()}`,
        text: newComment.text,
        question_id: newComment.question_id,
        author_email: user.email,
        author_name: user.full_name,
        created_at: new Date().toISOString(),
        is_resolved: false
      };

      const updatedComments = [...comments, comment];

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          collaboration_comments: updatedComments
        }
      });

      setComments(updatedComments);
      setNewComment({ text: "", question_id: null, is_resolved: false });
      toast.success("Comment added");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const updatedComments = comments.filter(c => c.id !== commentId);

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          collaboration_comments: updatedComments
        }
      });

      setComments(updatedComments);
      toast.success("Comment deleted");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const toggleResolved = async (commentId) => {
    try {
      const updatedComments = comments.map(c =>
        c.id === commentId ? { ...c, is_resolved: !c.is_resolved } : c
      );

      await base44.entities.CustomForm.update(form.id, {
        config: {
          ...form.config,
          collaboration_comments: updatedComments
        }
      });

      setComments(updatedComments);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const getQuestionText = (questionId) => {
    if (!questionId) return "General";
    
    if (!form.config?.sections) return "General";
    
    for (const section of form.config.sections) {
      const question = section.questions?.find(q => q.id === questionId);
      if (question) return question.question_text || "Untitled Question";
    }
    return "Unknown Question";
  };

  const unresolvedCount = comments.filter(c => !c.is_resolved).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Collaboration & Comments
          {unresolvedCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700">
              {unresolvedCount} unresolved
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <Textarea
            placeholder="Add a comment or note about this form..."
            value={newComment.text}
            onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
            rows={3}
          />
          
          <Button
            onClick={addComment}
            size="sm"
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            <Send className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No comments yet
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <Card key={comment.id} className={
                comment.is_resolved ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50"
              }>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.author_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      {comment.question_id && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {getQuestionText(comment.question_id)}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <p className="text-sm mb-2">{comment.text}</p>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleResolved(comment.id)}
                    className="text-xs"
                  >
                    {comment.is_resolved ? "Mark as Unresolved" : "Mark as Resolved"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}