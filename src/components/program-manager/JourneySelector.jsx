import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Map, Search, Loader2, BookOpen, Clock, Users, Check } from 'lucide-react';

export default function JourneySelector({ 
  open, 
  onClose, 
  selectedJourneyIds = [], 
  onSelectionChange,
  title = "Select Journeys for Program"
}) {
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelection, setLocalSelection] = useState(selectedJourneyIds);

  useEffect(() => {
    if (open) {
      loadJourneys();
      setLocalSelection(selectedJourneyIds);
    }
  }, [open, JSON.stringify(selectedJourneyIds)]);

  const loadJourneys = async () => {
    setLoading(true);
    try {
      // Load published journeys that can be assigned to programs
      const data = await base44.entities.LearningJourney.filter({
        status: 'published',
        is_template: false
      });
      setJourneys(data);
    } catch (error) {
      console.error('Error loading journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJourney = (journeyId) => {
    setLocalSelection(prev => 
      prev.includes(journeyId)
        ? prev.filter(id => id !== journeyId)
        : [...prev, journeyId]
    );
  };

  const handleConfirm = () => {
    onSelectionChange(localSelection);
    onClose();
  };

  const filteredJourneys = journeys.filter(j =>
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-purple-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Select learning journeys to include in this program. Journeys provide automated, personalized learning paths for participants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search journeys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {localSelection.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-700">
                {localSelection.length} journey{localSelection.length !== 1 ? 's' : ''} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocalSelection([])}
                className="text-purple-600 hover:text-purple-800"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Journey List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : filteredJourneys.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <Map className="w-10 h-10 mb-2 opacity-50" />
                <p>No published journeys found</p>
                <p className="text-sm">Create and publish journeys in the Journey Builder</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredJourneys.map((journey) => {
                  const isSelected = localSelection.includes(journey.id);
                  return (
                    <div
                      key={journey.id}
                      onClick={() => toggleJourney(journey.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleJourney(journey.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {journey.title}
                            </h4>
                            <Badge variant="outline" className="shrink-0">
                              {journey.type === 'learning_path' ? 'Learning Path' : 'Curriculum'}
                            </Badge>
                          </div>
                          
                          {journey.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {journey.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              <span>{journey.content_structure?.length || 0} resources</span>
                            </div>
                            {journey.estimated_duration_days && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{journey.estimated_duration_days} days</span>
                              </div>
                            )}
                            {journey.assigned_to_emails?.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{journey.assigned_to_emails.length} enrolled</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700">
            <Check className="w-4 h-4 mr-2" />
            Confirm Selection ({localSelection.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}