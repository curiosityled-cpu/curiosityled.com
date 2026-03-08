import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserMultiSelect({ 
  users = [], 
  selectedEmails = [], 
  onSelectionChange,
  maxHeight = "400px"
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query) ||
      user.current_role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleSelectAll = () => {
    onSelectionChange(filteredUsers.map(u => u.email));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleToggleUser = (email) => {
    if (selectedEmails.includes(email)) {
      onSelectionChange(selectedEmails.filter(e => e !== email));
    } else {
      onSelectionChange([...selectedEmails, email]);
    }
  };

  const handleRemoveSelected = (email) => {
    onSelectionChange(selectedEmails.filter(e => e !== email));
  };

  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedEmails.includes(u.email));
  }, [users, selectedEmails]);

  const allFilteredSelected = filteredUsers.length > 0 && 
    filteredUsers.every(u => selectedEmails.includes(u.email));

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, department, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={allFilteredSelected ? handleClearAll : handleSelectAll}
        >
          {allFilteredSelected ? 'Clear All' : 'Select All'}
        </Button>
      </div>

      {/* Selected Users Summary */}
      {selectedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Selected Users
                </CardTitle>
                <Badge className="bg-blue-600 text-white">
                  {selectedUsers.length} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-32">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <Badge
                      key={user.email}
                      variant="outline"
                      className="bg-white flex items-center gap-1 pr-1"
                    >
                      <span className="truncate max-w-[150px]">{user.full_name}</span>
                      <button
                        onClick={() => handleRemoveSelected(user.email)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Available Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                filteredUsers.map((user, idx) => (
                  <motion.div
                    key={user.email}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-blue-300 hover:bg-blue-50 ${
                      selectedEmails.includes(user.email) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleToggleUser(user.email)}
                  >
                    <Checkbox
                      checked={selectedEmails.includes(user.email)}
                      onCheckedChange={() => handleToggleUser(user.email)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {user.full_name}
                        </p>
                        {user.app_role && (
                          <Badge variant="outline" className="text-xs">
                            {user.app_role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="truncate">{user.email}</span>
                        {user.department && (
                          <>
                            <span>•</span>
                            <span>{user.department}</span>
                          </>
                        )}
                        {user.current_role && (
                          <>
                            <span>•</span>
                            <span className="truncate">{user.current_role}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}