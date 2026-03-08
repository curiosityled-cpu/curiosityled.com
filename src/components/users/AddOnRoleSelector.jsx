import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Plus, X, Shield, Users, BarChart3, Settings, Loader2 } from 'lucide-react';
import { ADDON_PERMISSIONS, PERMISSION_DESCRIPTIONS } from '@/components/utils/permissions';

/**
 * AddOnRoleSelector
 * Component for admins to assign add-on CustomRoles to users
 * 
 * @param {object} selectedUser - The user to assign add-ons to
 * @param {function} onUpdate - Callback when roles are updated
 */
export default function AddOnRoleSelector({ selectedUser, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [currentAddOn, setCurrentAddOn] = useState(null);
  const [customRoleId, setCustomRoleId] = useState('');
  const [showCustomIdInput, setShowCustomIdInput] = useState(false);
  const [allCustomRoles, setAllCustomRoles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadSystemTemplates();
      loadCurrentAddOn();
      loadAllCustomRoles();
    }
  }, [isOpen, selectedUser]);

  const loadSystemTemplates = async () => {
    try {
      const templates = await base44.entities.CustomRole.filter({
        is_system_template: true
      });
      setSystemTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load add-on templates');
    }
  };

  const loadAllCustomRoles = async () => {
    try {
      const roles = await base44.entities.CustomRole.list();
      setAllCustomRoles(roles);
    } catch (error) {
      console.error('Error loading custom roles:', error);
    }
  };

  const loadCurrentAddOn = async () => {
    if (selectedUser?.custom_role_id) {
      try {
        const roles = await base44.entities.CustomRole.filter({
          id: selectedUser.custom_role_id
        });
        if (roles.length > 0) {
          setCurrentAddOn(roles[0]);
          setCustomRoleId(selectedUser.custom_role_id);
        }
      } catch (error) {
        console.error('Error loading current add-on:', error);
      }
    } else {
      setCurrentAddOn(null);
      setCustomRoleId('');
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.User.update(selectedUser.id, {
        custom_role_id: selectedTemplate
      });
      
      toast.success('Add-on role assigned successfully');
      setIsOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error assigning add-on:', error);
      toast.error('Failed to assign add-on role');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCustomId = async () => {
    if (!customRoleId.trim()) {
      toast.error('Please enter a custom role ID');
      return;
    }

    setLoading(true);
    try {
      // Verify the role exists
      const roles = await base44.entities.CustomRole.filter({ id: customRoleId });
      if (roles.length === 0) {
        toast.error('Custom role not found with that ID');
        setLoading(false);
        return;
      }

      await base44.entities.User.update(selectedUser.id, {
        custom_role_id: customRoleId
      });
      
      toast.success('Custom role assigned successfully');
      setIsOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error assigning custom role:', error);
      toast.error('Failed to assign custom role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAddOn = async () => {
    setLoading(true);
    try {
      await base44.entities.User.update(selectedUser.id, {
        custom_role_id: null
      });
      
      toast.success('Add-on removed');
      setCurrentAddOn(null);
      setCustomRoleId('');
      setIsOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing add-on:', error);
      toast.error('Failed to remove add-on');
    } finally {
      setLoading(false);
    }
  };

  const getAddOnIcon = (roleName) => {
    if (roleName?.includes('Team Leader')) return <Users className="w-4 h-4" />;
    if (roleName?.includes('Analyst')) return <BarChart3 className="w-4 h-4" />;
    if (roleName?.includes('Program')) return <Settings className="w-4 h-4" />;
    if (roleName?.includes('HR')) return <Shield className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Add-On Permissions</Label>
        <div className="flex items-center gap-2">
          {currentAddOn ? (
            <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
              {getAddOnIcon(currentAddOn.role_name)}
              <span>{currentAddOn.role_name}</span>
              <span className="text-xs text-gray-500">({currentAddOn.permissions?.length || 0} permissions)</span>
            </Badge>
          ) : (
            <span className="text-sm text-gray-500">No add-on assigned</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
          >
            {currentAddOn ? 'Change' : 'Assign Add-On'}
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Add-On Permissions for {selectedUser?.full_name}</DialogTitle>
            <p className="text-sm text-gray-600">
              Add-on roles grant additional permissions while maintaining the user's base role: <strong>{selectedUser?.app_role}</strong>
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Add-On */}
            {currentAddOn && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getAddOnIcon(currentAddOn.role_name)}
                      Currently Assigned: {currentAddOn.role_name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAddOn}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">{currentAddOn.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {currentAddOn.permissions?.slice(0, 8).map((perm, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {currentAddOn.permissions?.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{currentAddOn.permissions.length - 8} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Templates */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Assign: System Templates</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {systemTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id
                        ? 'border-2 border-blue-500 bg-blue-50'
                        : 'border hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-2">
                        {getAddOnIcon(template.role_name)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{template.role_name}</h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {template.permissions?.slice(0, 3).map((perm, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {perm.split('.')[0]}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">
                          +{(template.permissions?.length || 0) - 3}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {selectedTemplate && (
                <Button
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAssignTemplate}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Assign Selected Template
                </Button>
              )}
            </div>

            {/* Direct Custom Role ID Input */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Advanced: Direct Role Assignment</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomIdInput(!showCustomIdInput)}
                >
                  {showCustomIdInput ? 'Hide' : 'Show'}
                </Button>
              </div>
              
              {showCustomIdInput && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <Label htmlFor="customRoleId" className="text-xs">Custom Role ID</Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={customRoleId} onValueChange={setCustomRoleId}>
                        <SelectTrigger id="customRoleId">
                          <SelectValue placeholder="Select a custom role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allCustomRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.role_name}
                              {role.is_system_template && (
                                <Badge variant="secondary" className="ml-2 text-xs">Template</Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAssignCustomId}
                        disabled={loading || !customRoleId}
                        size="sm"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Directly assign any custom role by ID. Use this for custom-created roles beyond system templates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}