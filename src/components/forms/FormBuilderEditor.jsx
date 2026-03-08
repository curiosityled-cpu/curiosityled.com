import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Settings } from "lucide-react";
import QuestionTypeSelector from "./QuestionTypeSelector";
import QuestionEditor from "./QuestionEditor";

export default function FormBuilderEditor({ sections = [], onChange }) {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showQuestionSelector, setShowQuestionSelector] = useState(null);

  const handleAddSection = () => {
    const newSection = {
      id: `section_${Date.now()}`,
      title: `Section ${(sections || []).length + 1}`,
      description: "",
      questions: []
    };
    onChange([...(sections || []), newSection]);
  };

  const handleDeleteSection = (sectionId) => {
    onChange(sections.filter(s => s.id !== sectionId));
  };

  const handleUpdateSection = (sectionId, updates) => {
    onChange(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
  };

  const handleAddQuestion = (sectionId, questionType) => {
    const newQuestion = {
      id: `q_${Date.now()}`,
      type: questionType,
      question_text: "New Question",
      required: false,
      options: questionType === "multiple_choice" || questionType === "checkboxes" || questionType === "dropdown"
        ? ["Option 1", "Option 2"]
        : undefined,
      min_value: questionType === "rating_scale" || questionType === "linear_scale" ? 1 : undefined,
      max_value: questionType === "rating_scale" || questionType === "linear_scale" ? 5 : undefined
    };

    onChange(sections.map(s => 
      s.id === sectionId 
        ? { ...s, questions: [...s.questions, newQuestion] }
        : s
    ));
    setShowQuestionSelector(null);
  };

  const handleUpdateQuestion = (sectionId, questionId, updates) => {
    onChange(sections.map(s => 
      s.id === sectionId
        ? {
            ...s,
            questions: s.questions.map(q => 
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : s
    ));
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    onChange(sections.map(s => 
      s.id === sectionId
        ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
        : s
    ));
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion(null);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === "section") {
      const newSections = Array.from(sections);
      const [removed] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, removed);
      onChange(newSections);
    } else if (type === "question") {
      const sectionId = source.droppableId;
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      
      const newQuestions = Array.from(section.questions);
      const [removed] = newQuestions.splice(source.index, 1);
      newQuestions.splice(destination.index, 0, removed);
      
      onChange(sections.map(s => 
        s.id === sectionId ? { ...s, questions: newQuestions } : s
      ));
    }
  };

  if (!sections || sections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No sections yet. Add your first section to get started.</p>
        <Button onClick={handleAddSection} style={{ backgroundColor: '#0202ff' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="p-4"
                    >
                      {/* Section Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div {...provided.dragHandleProps} className="mt-2 cursor-move">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                            className="text-lg font-semibold w-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                            placeholder="Section Title"
                          />
                          <textarea
                            value={section.description}
                            onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                            className="text-sm text-gray-600 w-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 mt-1"
                            placeholder="Section description (optional)"
                            rows={2}
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Questions */}
                      <Droppable droppableId={section.id} type="question">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 ml-8">
                            {section.questions.map((question, questionIndex) => (
                              <Draggable key={question.id} draggableId={question.id} index={questionIndex}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                                  >
                                    <div {...provided.dragHandleProps} className="cursor-move">
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{question.question_text}</p>
                                      <p className="text-xs text-gray-500">{question.type.replace(/_/g, ' ')}</p>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setSelectedQuestion({ sectionId: section.id, question })}
                                    >
                                      <Settings className="w-4 h-4" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteQuestion(section.id, question.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* Add Question Button */}
                      <div className="ml-8 mt-3">
                        {showQuestionSelector === section.id ? (
                          <QuestionTypeSelector
                            onSelect={(type) => handleAddQuestion(section.id, type)}
                            onCancel={() => setShowQuestionSelector(null)}
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQuestionSelector(section.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                          </Button>
                        )}
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button onClick={handleAddSection} variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </Button>

      {/* Question Editor Modal */}
      {selectedQuestion && (
        <QuestionEditor
          question={selectedQuestion.question}
          allQuestions={sections.flatMap(s => s.questions || [])}
          onSave={(updates) => {
            handleUpdateQuestion(selectedQuestion.sectionId, selectedQuestion.question.id, updates);
            setSelectedQuestion(null);
          }}
          onCancel={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
}