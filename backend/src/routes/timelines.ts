import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as timelineService from '../services/timelineService.js';

const router = Router();

// Get all timelines
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, analysisId } = req.query;

    const timelines = await timelineService.getTimelines({
      workspaceId: workspaceId as string,
      analysisId: analysisId as string,
      userId: req.user!.id,
    });

    res.json({ timelines });
  } catch (error) {
    console.error('Get timelines error:', error);
    res.status(500).json({ error: 'Failed to get timelines' });
  }
});

// Get a specific timeline
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const timeline = await timelineService.getTimeline(req.params.id);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json({ timeline });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Create a new timeline
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, workspaceId, analysisId, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const timeline = await timelineService.createTimeline(name, req.user!.id, {
      description,
      workspaceId,
      analysisId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json({ timeline });
  } catch (error) {
    console.error('Create timeline error:', error);
    res.status(500).json({ error: 'Failed to create timeline' });
  }
});

// Build timeline from document
router.post('/from-document/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.params;
    const { name } = req.body;

    const timeline = await timelineService.buildTimelineFromDocument(
      documentId,
      req.user!.id,
      name
    );

    res.status(201).json({ timeline });
  } catch (error: any) {
    console.error('Build timeline error:', error);
    res.status(500).json({ error: error.message || 'Failed to build timeline' });
  }
});

// Extract events from text
router.post('/extract', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const events = await timelineService.extractEventsFromText(text);

    res.json({ events });
  } catch (error) {
    console.error('Extract events error:', error);
    res.status(500).json({ error: 'Failed to extract events' });
  }
});

// Update timeline metadata
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, startDate, endDate } = req.body;

    const timeline = await timelineService.updateTimeline(req.params.id, {
      name,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.json({ timeline });
  } catch (error) {
    console.error('Update timeline error:', error);
    res.status(500).json({ error: 'Failed to update timeline' });
  }
});

// Add an event to a timeline
router.post('/:id/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, endDate, type, category, color, icon, importance, metadata } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }

    const event = await timelineService.addEvent(id, {
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      category,
      color,
      icon,
      importance,
      metadata,
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// Update an event
router.patch('/events/:eventId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, date, endDate, type, category, color, icon, importance, metadata } = req.body;

    const event = await timelineService.updateEvent(eventId, {
      title,
      description,
      date: date ? new Date(date) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      category,
      color,
      icon,
      importance,
      metadata,
    });

    res.json({ event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event
router.delete('/events/:eventId', authenticate, async (req: AuthRequest, res) => {
  try {
    await timelineService.deleteEvent(req.params.eventId);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get events in date range
router.get('/:id/events/range', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const events = await timelineService.getEventsInRange(
      req.params.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({ events });
  } catch (error) {
    console.error('Get events range error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get events by category
router.get('/:id/events/category/:category', authenticate, async (req: AuthRequest, res) => {
  try {
    const events = await timelineService.getEventsByCategory(
      req.params.id,
      req.params.category
    );

    res.json({ events });
  } catch (error) {
    console.error('Get events by category error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Merge multiple timelines
router.post('/merge', authenticate, async (req: AuthRequest, res) => {
  try {
    const { timelineIds, name } = req.body;

    if (!timelineIds || !Array.isArray(timelineIds) || timelineIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 timeline IDs are required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const merged = await timelineService.mergeTimelines(timelineIds, name, req.user!.id);

    res.status(201).json({ timeline: merged });
  } catch (error) {
    console.error('Merge timelines error:', error);
    res.status(500).json({ error: 'Failed to merge timelines' });
  }
});

// Delete a timeline
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await timelineService.deleteTimeline(req.params.id);
    res.json({ message: 'Timeline deleted' });
  } catch (error) {
    console.error('Delete timeline error:', error);
    res.status(500).json({ error: 'Failed to delete timeline' });
  }
});

export default router;
