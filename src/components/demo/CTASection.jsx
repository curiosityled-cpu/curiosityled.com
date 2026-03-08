import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function CTASection({ title, description, buttonText, highlight, variant = "default" }) {
  const handleBookCall = () => {
    window.open('https://calendly.com/curiosityled', '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6 text-center">
          {highlight && (
            <Badge className="mb-3 bg-green-100 text-green-800 border-green-200">
              <Sparkles className="w-3 h-3 mr-1" />
              {highlight}
            </Badge>
          )}
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4 text-sm">{description}</p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleBookCall}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Phone className="w-4 h-4 mr-2" />
              {buttonText || "Book a Demo"}
            </Button>
            
            <p className="text-xs text-gray-500">
              15-minute call • No commitment required
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}