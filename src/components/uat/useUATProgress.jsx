import { useState, useEffect } from 'react';

export const useUATProgress = (userEmail, uatCycle, testCases) => {
  const storageKey = userEmail && uatCycle ? `uat_progress_${userEmail}_${uatCycle}` : null;
  
  const [progress, setProgress] = useState(() => {
    if (!storageKey) {
      return {
        currentIndex: 0,
        completedTests: [],
        skippedTests: []
      };
    }
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {
          currentIndex: 0,
          completedTests: [],
          skippedTests: []
        };
      }
    }
    return {
      currentIndex: 0,
      completedTests: [],
      skippedTests: []
    };
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [progress, storageKey]);

  const markComplete = (testId) => {
    setProgress(prev => ({
      ...prev,
      completedTests: [...new Set([...prev.completedTests, testId])],
      skippedTests: prev.skippedTests.filter(id => id !== testId)
    }));
  };

  const markSkipped = (testId) => {
    setProgress(prev => ({
      ...prev,
      skippedTests: [...new Set([...prev.skippedTests, testId])],
      currentIndex: Math.min(prev.currentIndex + 1, testCases.length - 1)
    }));
  };

  const goToNext = () => {
    setProgress(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, testCases.length - 1)
    }));
  };

  const goToPrevious = () => {
    setProgress(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0)
    }));
  };

  const goToTest = (index) => {
    // Only allow going back, not forward (sequential testing)
    if (index <= progress.currentIndex) {
      setProgress(prev => ({
        ...prev,
        currentIndex: index
      }));
    }
  };

  const resetProgress = () => {
    setProgress({
      currentIndex: 0,
      completedTests: [],
      skippedTests: []
    });
  };

  const getCompletionPercentage = () => {
    if (testCases.length === 0) return 0;
    return Math.round((progress.completedTests.length / testCases.length) * 100);
  };

  const isTestAccessible = (index) => {
    // Can access current test or any previous test
    return index <= progress.currentIndex;
  };

  const isComplete = () => {
    return getCompletionPercentage() >= 80; // 80% threshold
  };

  return {
    progress,
    markComplete,
    markSkipped,
    goToNext,
    goToPrevious,
    goToTest,
    resetProgress,
    getCompletionPercentage,
    isTestAccessible,
    isComplete,
    currentTest: testCases[progress.currentIndex],
    totalTests: testCases.length,
    completedCount: progress.completedTests.length,
    skippedCount: progress.skippedTests.length
  };
};