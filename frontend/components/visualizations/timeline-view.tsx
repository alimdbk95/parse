'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Flag,
  Clock,
  Milestone,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: string;
  category?: string;
  color?: string;
  icon?: string;
  importance: string;
}

interface TimelineViewProps {
  timelineId?: string;
  documentId?: string;
  onTimelineCreated?: (timeline: any) => void;
}

const EVENT_TYPES = [
  { type: 'event', label: 'Event', icon: Calendar, color: '#8b5cf6' },
  { type: 'milestone', label: 'Milestone', icon: Milestone, color: '#22c55e' },
  { type: 'period', label: 'Period', icon: Clock, color: '#06b6d4' },
  { type: 'deadline', label: 'Deadline', icon: AlertTriangle, color: '#ef4444' },
];

const IMPORTANCE_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#8b5cf6',
  low: '#6b7280',
};

export function TimelineView({ timelineId, documentId, onTimelineCreated }: TimelineViewProps) {
  const [timeline, setTimeline] = useState<{
    id: string;
    name: string;
    events: TimelineEvent[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'event',
    importance: 'medium',
  });

  useEffect(() => {
    if (timelineId) {
      fetchTimeline();
    } else if (documentId) {
      buildTimelineFromDocument();
    }
  }, [timelineId, documentId]);

  const fetchTimeline = async () => {
    if (!timelineId) return;
    setLoading(true);
    try {
      const { timeline: fetchedTimeline } = await api.getTimeline(timelineId);
      setTimeline(fetchedTimeline);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTimelineFromDocument = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const { timeline: newTimeline } = await api.buildTimelineFromDocument(documentId);
      setTimeline(newTimeline);
      onTimelineCreated?.(newTimeline);
    } catch (error) {
      console.error('Failed to build timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    if (!timeline) return [];
    const cats = new Set(timeline.events.filter((e) => e.category).map((e) => e.category!));
    return Array.from(cats);
  }, [timeline]);

  const filteredEvents = useMemo(() => {
    if (!timeline) return [];
    let events = [...timeline.events];
    if (filterCategory) {
      events = events.filter((e) => e.category === filterCategory);
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [timeline, filterCategory]);

  const handleAddEvent = async () => {
    if (!timeline || !newEvent.title || !newEvent.date) return;
    try {
      const { event } = await api.addTimelineEvent(timeline.id, {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        endDate: newEvent.endDate,
        type: newEvent.type,
        category: newEvent.category,
        importance: newEvent.importance,
      });
      setTimeline((prev) =>
        prev ? { ...prev, events: [...prev.events, event] } : null
      );
      setShowAddEvent(false);
      setNewEvent({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'event',
        importance: 'medium',
      });
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!timeline) return;
    try {
      await api.deleteTimelineEvent(eventId);
      setTimeline((prev) =>
        prev ? { ...prev, events: prev.events.filter((e) => e.id !== eventId) } : null
      );
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const getEventIcon = (type: string) => {
    const eventType = EVENT_TYPES.find((t) => t.type === type);
    return eventType?.icon || Calendar;
  };

  const getEventColor = (event: TimelineEvent) => {
    if (event.color) return event.color;
    const eventType = EVENT_TYPES.find((t) => t.type === event.type);
    return eventType?.color || '#8b5cf6';
  };

  // Calculate timeline bounds and scale
  const { minDate, maxDate, scale } = useMemo(() => {
    if (!filteredEvents.length) {
      return { minDate: new Date(), maxDate: new Date(), scale: 1 };
    }

    const dates = filteredEvents.map((e) => new Date(e.date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const range = max - min || 1;

    return {
      minDate: new Date(min),
      maxDate: new Date(max),
      scale: 800 / range, // pixels per millisecond
    };
  }, [filteredEvents]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-foreground-tertiary mb-4" />
          <p className="text-foreground-secondary">No timeline data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {timeline.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'px-3 py-1.5 text-xs',
                  viewMode === 'timeline'
                    ? 'bg-primary text-white'
                    : 'hover:bg-background-secondary'
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 text-xs',
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'hover:bg-background-secondary'
                )}
              >
                List
              </button>
            </div>
            {categories.length > 0 && (
              <select
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value || null)}
                className="px-2 py-1.5 rounded-lg bg-background-secondary border border-border text-xs"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowAddEvent(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Event
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {viewMode === 'timeline' ? (
          <div className="relative min-h-[400px] py-8">
            {/* Timeline axis */}
            <div className="absolute left-8 right-8 top-1/2 h-1 bg-border rounded-full" />

            {/* Date labels */}
            <div className="absolute left-8 top-1/2 transform -translate-y-6 text-xs text-foreground-secondary">
              {formatDate(minDate.toISOString())}
            </div>
            <div className="absolute right-8 top-1/2 transform -translate-y-6 text-xs text-foreground-secondary">
              {formatDate(maxDate.toISOString())}
            </div>

            {/* Events */}
            {filteredEvents.map((event, index) => {
              const eventDate = new Date(event.date).getTime();
              const position =
                ((eventDate - minDate.getTime()) * scale) / 800 * 100;
              const isAbove = index % 2 === 0;
              const Icon = getEventIcon(event.type);
              const color = getEventColor(event);

              return (
                <div
                  key={event.id}
                  className="absolute transform -translate-x-1/2 cursor-pointer group"
                  style={{
                    left: `calc(${Math.max(5, Math.min(95, position))}%)`,
                    top: isAbove ? 'calc(50% - 60px)' : 'calc(50% + 20px)',
                  }}
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Connector line */}
                  <div
                    className={cn(
                      'absolute left-1/2 w-0.5 bg-border',
                      isAbove ? 'top-full h-[40px]' : 'bottom-full h-[20px]'
                    )}
                  />

                  {/* Event card */}
                  <div
                    className={cn(
                      'flex flex-col items-center p-2 rounded-lg border transition-all',
                      'hover:shadow-lg hover:scale-105',
                      selectedEvent?.id === event.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background-secondary'
                    )}
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <p className="text-xs font-medium text-center max-w-[120px] truncate">
                      {event.title}
                    </p>
                    <p className="text-[10px] text-foreground-tertiary">
                      {formatDate(event.date)}
                    </p>
                  </div>

                  {/* Importance indicator */}
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                    style={{
                      backgroundColor:
                        IMPORTANCE_COLORS[event.importance as keyof typeof IMPORTANCE_COLORS],
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const Icon = getEventIcon(event.type);
              const color = getEventColor(event);

              return (
                <div
                  key={event.id}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors',
                    selectedEvent?.id === event.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            IMPORTANCE_COLORS[event.importance as keyof typeof IMPORTANCE_COLORS],
                        }}
                      />
                    </div>
                    {event.description && (
                      <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary">
                      <span>{formatDate(event.date)}</span>
                      {event.endDate && <span>→ {formatDate(event.endDate)}</span>}
                      {event.category && (
                        <span className="px-2 py-0.5 rounded-full bg-background-tertiary">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id);
                    }}
                    className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {filteredEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-foreground-tertiary mb-4" />
                <p className="text-foreground-secondary">No events yet</p>
                <Button variant="ghost" onClick={() => setShowAddEvent(true)} className="mt-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        title="Add Event"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Event title"
            value={newEvent.title || ''}
            onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Input
            placeholder="Description (optional)"
            value={newEvent.description || ''}
            onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">Date</label>
              <Input
                type="date"
                value={newEvent.date || ''}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">
                End Date (optional)
              </label>
              <Input
                type="date"
                value={newEvent.endDate || ''}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-foreground-secondary mb-2 block">Event Type</label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setNewEvent((prev) => ({ ...prev, type: type.type }))}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                    newEvent.type === type.type
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <type.icon className="h-5 w-5" style={{ color: type.color }} />
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">Importance</label>
              <select
                value={newEvent.importance || 'medium'}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, importance: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-border"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary mb-1 block">
                Category (optional)
              </label>
              <Input
                placeholder="e.g., Meeting, Launch"
                value={newEvent.category || ''}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddEvent(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent}>Add Event</Button>
          </div>
        </div>
      </Modal>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = getEventIcon(selectedEvent.type);
                const color = getEventColor(selectedEvent);
                return (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                );
              })()}
              <div>
                <p className="text-sm text-foreground-secondary capitalize">
                  {selectedEvent.type}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        IMPORTANCE_COLORS[
                          selectedEvent.importance as keyof typeof IMPORTANCE_COLORS
                        ],
                    }}
                  />
                  <span className="text-xs capitalize">{selectedEvent.importance}</span>
                </div>
              </div>
            </div>

            {selectedEvent.description && (
              <p className="text-foreground-secondary">{selectedEvent.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-foreground-tertiary" />
                <span>{formatDate(selectedEvent.date)}</span>
                {selectedEvent.endDate && (
                  <>
                    <span className="text-foreground-tertiary">to</span>
                    <span>{formatDate(selectedEvent.endDate)}</span>
                  </>
                )}
              </div>
              {selectedEvent.category && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-foreground-tertiary" />
                  <span>{selectedEvent.category}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                className="text-red-500"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button onClick={() => setSelectedEvent(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
