import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Trash2, MessageSquare, CheckCircle, Search, Download, Loader2, Filter } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ConversationHistory({ 
  conversations, 
  currentConversationId, 
  onSelect, 
  onDelete,
  onClose 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportingId, setExportingId] = useState(null);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        // Search in title
        if (conv.title?.toLowerCase().includes(query)) return true;
        
        // Search in messages
        if (conv.messages?.some(msg => 
          msg.content?.toLowerCase().includes(query)
        )) return true;
        
        return false;
      });
    }

    return filtered;
  }, [conversations, searchQuery, statusFilter]);

  const getConversationPreview = (conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return "No messages yet";
    }
    
    const lastUserMessage = [...conversation.messages]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (lastUserMessage) {
      return lastUserMessage.content.substring(0, 60) + (lastUserMessage.content.length > 60 ? '...' : '');
    }
    
    return "Conversation started";
  };

  const getConversationDate = (conversation) => {
    const date = new Date(conversation.last_activity || conversation.created_date);
    return format(date, 'MMM d, h:mm a');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportPDF = async (conversation, e) => {
    e.stopPropagation();
    
    setExportingId(conversation.id);
    try {
      const response = await base44.functions.invoke('exportConversationPDF', {
        conversation_id: conversation.id
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atreus-conversation-${format(new Date(conversation.created_date), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Conversation exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export conversation');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <motion.div
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      className="absolute top-0 right-0 h-full w-full bg-white rounded-2xl shadow-xl z-10 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Conversation History</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {(searchQuery || statusFilter !== "all") && (
          <p className="text-xs text-gray-500">
            Found {filteredConversations.length} of {conversations.length} conversations
          </p>
        )}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-4">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery || statusFilter !== "all" 
                ? "No conversations match your search"
                : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                  conversation.id === currentConversationId
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSelect(conversation)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {conversation.title || 'Untitled Conversation'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getConversationDate(conversation)}
                    </p>
                  </div>
                  {conversation.id === currentConversationId && (
                    <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {getConversationPreview(conversation)}
                </p>

                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getStatusColor(conversation.status)}`}>
                    {conversation.status}
                  </Badge>
                  
                  {conversation.messages && (
                    <span className="text-xs text-gray-500">
                      {conversation.messages.length} messages
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => handleExportPDF(conversation, e)}
                    disabled={exportingId === conversation.id}
                    title="Export as PDF"
                  >
                    {exportingId === conversation.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    ) : (
                      <Download className="w-3 h-3 text-purple-600" />
                    )}
                  </Button>
                  
                  {conversation.id !== currentConversationId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) {
                          onDelete(conversation.id);
                        }
                      }}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}