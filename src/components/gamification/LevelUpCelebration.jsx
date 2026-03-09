import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Sparkles, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

export default function LevelUpCelebration({ open, onOpenChange, levelData }) {
  useEffect(() => {
    if (open && levelData) {
      // Trigger confetti animation
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0202ff', '#7c3aed', '#fbbf24']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0202ff', '#7c3aed', '#fbbf24']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open, levelData]);

  if (!levelData) return null;

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md bg-gradient-to-br from-purple-600 to-blue-600 border-none text-white">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-center space-y-6 py-4"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center"
              >
                <Trophy className="w-12 h-12 text-yellow-300" />
              </motion.div>

              <div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold mb-2"
                >
                  Level Up!
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg opacity-90"
                >
                  You've reached Level {levelData.level_order}
                </motion.p>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold mt-2"
                >
                  {levelData.level_name}
                </motion.p>
              </div>

              {levelData.unlocks && levelData.unlocks.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/10 rounded-lg p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <h3 className="font-semibold">New Unlocks</h3>
                  </div>
                  <div className="space-y-2">
                    {levelData.unlocks.map((unlock, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 + (idx * 0.1) }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                        <span>{unlock}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {levelData.rewards && levelData.rewards.badge_ids && levelData.rewards.badge_ids.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white/10 rounded-lg p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-300" />
                    <h3 className="font-semibold">Rewards Earned</h3>
                  </div>
                  <p className="text-sm opacity-90">
                    {levelData.rewards.badge_ids.length} new badge{levelData.rewards.badge_ids.length !== 1 ? 's' : ''} unlocked!
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <Button
                  onClick={() => onOpenChange(false)}
                  className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8"
                >
                  Continue
                </Button>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}