import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuestionDisplay({ question, onAnswer, showFeedback = true }) {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(null);

    const handleSubmit = () => {
        if (selectedAnswer === null) return;
        
        const correct = selectedAnswer === question.correct_answer_index;
        setIsCorrect(correct);
        setSubmitted(true);
        
        if (onAnswer) {
            onAnswer({
                question_text: question.text,
                selected_answer: selectedAnswer,
                is_correct: correct
            });
        }
    };

    const handleNext = () => {
        setSelectedAnswer(null);
        setSubmitted(false);
        setIsCorrect(null);
    };

    return (
        <Card className="shadow-lg border-0">
            <CardHeader>
                <CardTitle className="text-lg">{question.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup
                    value={selectedAnswer !== null ? selectedAnswer.toString() : undefined}
                    onValueChange={(value) => !submitted && setSelectedAnswer(parseInt(value))}
                    disabled={submitted}
                >
                    {question.options.map((option, index) => (
                        <div
                            key={index}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                                submitted && index === question.correct_answer_index
                                    ? 'border-green-500 bg-green-50'
                                    : submitted && index === selectedAnswer && !isCorrect
                                    ? 'border-red-500 bg-red-50'
                                    : selectedAnswer === index
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label
                                htmlFor={`option-${index}`}
                                className="flex-1 cursor-pointer font-normal"
                            >
                                {option}
                            </Label>
                            {submitted && index === question.correct_answer_index && (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {submitted && index === selectedAnswer && !isCorrect && (
                                <XCircle className="w-5 h-5 text-red-600" />
                            )}
                        </div>
                    ))}
                </RadioGroup>

                <AnimatePresence>
                    {submitted && showFeedback && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-start gap-3 p-4 rounded-lg ${
                                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}
                        >
                            {isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                <p className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                    {isCorrect ? 'Correct!' : 'Incorrect'}
                                </p>
                                {!isCorrect && (
                                    <p className="text-sm text-red-700 mt-1">
                                        The correct answer is: {question.options[question.correct_answer_index]}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex justify-end">
                    {!submitted ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={selectedAnswer === null}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Submit Answer
                        </Button>
                    ) : (
                        <Button onClick={handleNext} variant="outline">
                            Next Question
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}