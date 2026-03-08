import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Code, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function FormEmbedGenerator({ form, publicUrl }) {
  const [embedOptions, setEmbedOptions] = useState({
    width: "100%",
    height: "600px",
    showTitle: true,
    showDescription: true,
    backgroundColor: "#ffffff",
    borderRadius: "8px"
  });

  const generateIframeCode = () => {
    const style = `width: ${embedOptions.width}; height: ${embedOptions.height}; border: none; border-radius: ${embedOptions.borderRadius};`;
    return `<iframe src="${publicUrl}" style="${style}" title="${form.title}"></iframe>`;
  };

  const generateScriptEmbed = () => {
    return `<div id="curiosity-led-form-${form.id}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${publicUrl}';
    iframe.style.width = '${embedOptions.width}';
    iframe.style.height = '${embedOptions.height}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '${embedOptions.borderRadius}';
    iframe.title = '${form.title}';
    document.getElementById('curiosity-led-form-${form.id}').appendChild(iframe);
  })();
</script>`;
  };

  const generatePopupCode = () => {
    return `<button id="curiosity-led-popup-trigger-${form.id}" style="padding: 10px 20px; background: #0202ff; color: white; border: none; border-radius: 6px; cursor: pointer;">Open Form</button>
<script>
  (function() {
    document.getElementById('curiosity-led-popup-trigger-${form.id}').addEventListener('click', function() {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';
      
      var container = document.createElement('div');
      container.style.cssText = 'background: white; border-radius: 12px; width: 90%; max-width: 800px; height: 90%; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
      
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: white; border: 1px solid #ddd; border-radius: 50%; width: 32px; height: 32px; font-size: 24px; cursor: pointer; z-index: 1; line-height: 1;';
      closeBtn.onclick = function() { document.body.removeChild(overlay); };
      
      var iframe = document.createElement('iframe');
      iframe.src = '${publicUrl}';
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 12px;';
      iframe.title = '${form.title}';
      
      container.appendChild(closeBtn);
      container.appendChild(iframe);
      overlay.appendChild(container);
      overlay.onclick = function(e) { if (e.target === overlay) document.body.removeChild(overlay); };
      document.body.appendChild(overlay);
    });
  })();
</script>`;
  };

  const generateWordPressShortcode = () => {
    return `[curiosity_led_form id="${form.id}" width="${embedOptions.width}" height="${embedOptions.height}"]`;
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Embed & Distribute Form
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Generate embed codes and share your form across platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!publicUrl ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Enable public access first to generate embed codes
            </p>
          </div>
        ) : (
          <>
            {/* Embed Options */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium">Customization Options</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="width" className="text-xs">Width</Label>
                  <Input
                    id="width"
                    value={embedOptions.width}
                    onChange={(e) => setEmbedOptions({ ...embedOptions, width: e.target.value })}
                    placeholder="100%"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Height</Label>
                  <Input
                    id="height"
                    value={embedOptions.height}
                    onChange={(e) => setEmbedOptions({ ...embedOptions, height: e.target.value })}
                    placeholder="600px"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bg" className="text-xs">Background</Label>
                  <Input
                    id="bg"
                    type="color"
                    value={embedOptions.backgroundColor}
                    onChange={(e) => setEmbedOptions({ ...embedOptions, backgroundColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="radius" className="text-xs">Border Radius</Label>
                  <Input
                    id="radius"
                    value={embedOptions.borderRadius}
                    onChange={(e) => setEmbedOptions({ ...embedOptions, borderRadius: e.target.value })}
                    placeholder="8px"
                  />
                </div>
              </div>
            </div>

            {/* Embed Codes */}
            <Tabs defaultValue="iframe">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="iframe">iFrame</TabsTrigger>
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="popup">Popup</TabsTrigger>
                <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              </TabsList>

              <TabsContent value="iframe" className="space-y-2">
                <Label className="text-xs">Standard iFrame Embed</Label>
                <Textarea
                  value={generateIframeCode()}
                  readOnly
                  rows={3}
                  className="font-mono text-xs"
                />
                <Button
                  onClick={() => copyToClipboard(generateIframeCode(), "iFrame code")}
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy iFrame Code
                </Button>
              </TabsContent>

              <TabsContent value="script" className="space-y-2">
                <Label className="text-xs">JavaScript Embed</Label>
                <Textarea
                  value={generateScriptEmbed()}
                  readOnly
                  rows={5}
                  className="font-mono text-xs"
                />
                <Button
                  onClick={() => copyToClipboard(generateScriptEmbed(), "Script code")}
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Script Code
                </Button>
              </TabsContent>

              <TabsContent value="popup" className="space-y-2">
                <Label className="text-xs">Popup/Modal Embed</Label>
                <Textarea
                  value={generatePopupCode()}
                  readOnly
                  rows={6}
                  className="font-mono text-xs"
                />
                <Button
                  onClick={() => copyToClipboard(generatePopupCode(), "Popup code")}
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Popup Code
                </Button>
              </TabsContent>

              <TabsContent value="wordpress" className="space-y-2">
                <Label className="text-xs">WordPress Shortcode</Label>
                <Input
                  value={generateWordPressShortcode()}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={() => copyToClipboard(generateWordPressShortcode(), "WordPress shortcode")}
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Shortcode
                </Button>
                <p className="text-xs text-gray-500">
                  Note: Requires Curiosity Led WordPress plugin
                </p>
              </TabsContent>
            </Tabs>

            {/* Direct Link */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs">Direct Link</Label>
              <div className="flex gap-2">
                <Input
                  value={publicUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  onClick={() => copyToClipboard(publicUrl, "Link")}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => window.open(publicUrl, '_blank')}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}