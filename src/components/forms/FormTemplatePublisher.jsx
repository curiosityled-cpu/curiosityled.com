import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FormTemplatePublisher({ form, onPublish }) {
  const [publishing, setPublishing] = useState(false);
  const [templateData, setTemplateData] = useState({
    title: form.title,
    description: form.description || "",
    thumbnail_url: "",
    tags: [],
    is_editable: true,
    is_platform_default: false
  });
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    if (tagInput.trim() && !templateData.tags.includes(tagInput.trim())) {
      setTemplateData({
        ...templateData,
        tags: [...templateData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setTemplateData({
      ...templateData,
      tags: templateData.tags.filter(t => t !== tag)
    });
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTemplateData({ ...templateData, thumbnail_url: file_url });
      toast.success("Thumbnail uploaded");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast.error("Failed to upload thumbnail");
    }
  };

  const publishAsTemplate = async () => {
    if (!templateData.title.trim()) {
      toast.error("Please enter a template title");
      return;
    }

    setPublishing(true);
    try {
      const user = await base44.auth.me();

      const template = await base44.entities.CustomFormTemplate.create({
        client_id: user.client_id,
        is_platform_default: false,
        title: templateData.title,
        description: templateData.description,
        form_type: form.form_type,
        form_category: form.form_category,
        thumbnail_url: templateData.thumbnail_url,
        tags: templateData.tags,
        config: JSON.parse(JSON.stringify(form.config)),
        is_editable: templateData.is_editable,
        use_count: 0
      });

      toast.success("Template published successfully");
      if (onPublish) onPublish(template);
    } catch (error) {
      console.error("Error publishing template:", error);
      toast.error("Failed to publish template");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Publish as Template
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Share this form as a reusable template
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="template_title">Template Title</Label>
          <Input
            id="template_title"
            value={templateData.title}
            onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })}
            placeholder="Enter template name"
          />
        </div>

        <div>
          <Label htmlFor="template_desc">Description</Label>
          <Textarea
            id="template_desc"
            value={templateData.description}
            onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
            placeholder="Describe what this template is for..."
            rows={3}
          />
        </div>

        <div>
          <Label>Thumbnail Image</Label>
          <div className="flex items-center gap-3 mt-2">
            {templateData.thumbnail_url ? (
              <img
                src={templateData.thumbnail_url}
                alt="Thumbnail"
                className="w-20 h-20 object-cover rounded border"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
                id="thumbnail-upload"
              />
              <label htmlFor="thumbnail-upload">
                <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('thumbnail-upload')?.click()}>
                  Upload Thumbnail
                </Button>
              </label>
            </div>
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tags..."
            />
            <Button onClick={addTag} variant="outline">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {templateData.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={publishAsTemplate}
          disabled={publishing}
          className="w-full"
          style={{ backgroundColor: '#0202ff' }}
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Publish Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}