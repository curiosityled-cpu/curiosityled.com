import React from "react";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AILoadingAnimation({ message, submessage }) {
  return (
    <Card className="max-w-2xl mx-auto p-8 text-center shadow-xl border-0">
      <div className="space-y-6">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity }
          }}
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ backgroundColor: '#0043ef' }}
        >
          <Brain className="w-8 h-8 text-white" />
        </motion.div>
        
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>
          <p className="text-gray-600">{submessage}</p>
        </div>
        
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#0043ef' }}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>AI is thinking...</span>
        </div>
      </div>
    </Card>
  );
}