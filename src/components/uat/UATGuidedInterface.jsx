import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  PlayCircle,
  X,
  Menu,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UATGuidedInterface({ 
  testCases,
  currentTest,
  progress,
  onStartTest,
  onPrevious,
  onNext,
  onSelectTest,
  onClose,
  getCompletionPercentage,
  isTestAccessible
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentIndex = testCases.findIndex(tc => tc.id === currentTest?.id);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        onNext();
      } else if (modKey && e.key === 'ArrowLeft' && canGoPrevious) {
        e.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const getTestStatus = (test) => {
    if (progress.completedTests.includes(test.id)) return 'completed';
    if (progress.skippedTests.includes(test.id)) return 'skipped';
    if (test.id === currentTest?.id) return 'current';
    return 'pending';
  };

  const canGoNext = currentIndex < testCases.length - 1;
  const canGoPrevious = currentIndex > 0;

  if (!currentTest) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No test cases available</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="h-full bg-white max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:bg-white/20 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">UAT Testing</h1>
                <p className="text-sm text-blue-100">
                  Test {currentIndex + 1} of {testCases.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium">{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="bg-blue-400" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Test List */}
          <div className={cn(
            "w-80 bg-gray-50 border-r overflow-y-auto transition-all duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "lg:block absolute lg:relative h-full z-10 lg:z-0"
          )}>
            <div className="p-4 border-b bg-white">
              <h2 className="font-semibold text-gray-900">Test Cases</h2>
              <p className="text-xs text-gray-600 mt-1">
                {progress.completedTests.length} completed · {progress.skippedTests.length} skipped
              </p>
            </div>
            <div className="p-2 space-y-1">
              {testCases.map((test, index) => {
                const status = getTestStatus(test);
                const accessible = isTestAccessible(index);
                
                return (
                  <button
                    key={test.id}
                    onClick={() => accessible && onSelectTest(index)}
                    disabled={!accessible}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all",
                      status === 'current' && "bg-blue-100 border-2 border-blue-600",
                      status === 'completed' && "bg-green-50 hover:bg-green-100",
                      status === 'skipped' && "bg-yellow-50 hover:bg-yellow-100",
                      status === 'pending' && accessible && "bg-white hover:bg-gray-100",
                      !accessible && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : status === 'skipped' ? (
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      ) : status === 'current' ? (
                        <Circle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 fill-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-600 mb-1">{test.id}</p>
                        <p className={cn(
                          "text-sm font-medium line-clamp-2",
                          status === 'current' && "text-blue-900",
                          status === 'completed' && "text-green-900",
                          status === 'skipped' && "text-yellow-900",
                          status === 'pending' && "text-gray-700"
                        )}>
                          {test.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content - Current Test */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="font-mono">{currentTest.id}</Badge>
                    <Badge>{currentTest.feature_area}</Badge>
                  </div>
                  <CardTitle className="text-2xl">{currentTest.title}</CardTitle>
                  <p className="text-gray-600 mt-2">{currentTest.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Test Steps */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Test Steps
                    </h3>
                    <ol className="space-y-2 list-decimal list-inside text-gray-700">
                      {currentTest.steps.map((step, idx) => (
                        <li key={idx} className="ml-2">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Expected Results */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Expected Results
                    </h3>
                    <ul className="space-y-2">
                      {currentTest.expected_results.map((result, idx) => (
                        <li key={idx} className="flex gap-2 text-gray-700">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{result}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Start Test Button */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
                    <p className="text-gray-700 mb-4">
                      Ready to test? Click below to navigate to the feature and start testing.
                    </p>
                    <Button
                      onClick={() => onStartTest(currentTest)}
                      size="lg"
                      className="gap-2"
                      style={{ backgroundColor: '#0202ff' }}
                    >
                      <PlayCircle className="w-5 h-5" />
                      Start Test
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  variant="outline"
                  className="gap-2"
                  title="Previous test (Ctrl/Cmd + ←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <span className="text-sm text-gray-600">
                  {currentIndex + 1} / {testCases.length}
                </span>

                <Button
                  onClick={onNext}
                  disabled={!canGoNext}
                  variant="outline"
                  className="gap-2"
                  title="Next test (Ctrl/Cmd + →)"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                💡 Use Ctrl/Cmd + Arrow keys to navigate between tests
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}