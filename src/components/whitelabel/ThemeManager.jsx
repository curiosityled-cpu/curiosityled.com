import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ThemeManager({ currentBranding, onLoadTheme }) {
  const [themes, setThemes] = useState([]);
  const [newThemeName, setNewThemeName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const data = await base44.entities.BrandingTheme.list('-created_date');
      setThemes(data);
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!newThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    try {
      await base44.entities.BrandingTheme.create({
        theme_name: newThemeName,
        configuration: currentBranding
      });
      setNewThemeName('');
      await loadThemes();
      toast.success('Theme saved successfully');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    }
  };

  const handleDeleteTheme = async (themeId) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    try {
      await base44.entities.BrandingTheme.delete(themeId);
      await loadThemes();
      toast.success('Theme deleted');
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Failed to delete theme');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Themes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="Theme name..."
          />
          <Button onClick={handleSaveTheme}>
            <Save className="w-4 h-4 mr-2" />
            Save Current
          </Button>
        </div>

        <div className="space-y-2">
          {themes.map((theme) => (
            <div key={theme.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{theme.theme_name}</p>
                <p className="text-xs text-gray-500">
                  Created {new Date(theme.created_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLoadTheme(theme)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Load
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteTheme(theme.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {themes.length === 0 && !loading && (
          <p className="text-center text-gray-500 text-sm py-8">
            No saved themes yet. Save your current configuration as a theme.
          </p>
        )}
      </CardContent>
    </Card>
  );
}