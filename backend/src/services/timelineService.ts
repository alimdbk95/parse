import { prisma } from '../index.js';
import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export interface TimelineEventInput {
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  type?: 'event' | 'milestone' | 'period' | 'deadline';
  category?: string;
  color?: string;
  icon?: string;
  importance?: 'low' | 'medium' | 'high' | 'critical';
  sourceDocId?: string;
  metadata?: Record<string, any>;
}

// Create a new timeline
export async function createTimeline(
  name: string,
  userId: string,
  options: {
    description?: string;
    workspaceId?: string;
    analysisId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  return prisma.timeline.create({
    data: {
      name,
      description: options.description,
      startDate: options.startDate,
      endDate: options.endDate,
      createdById: userId,
      workspaceId: options.workspaceId,
      analysisId: options.analysisId,
    },
    include: {
      events: {
        orderBy: { date: 'asc' },
      },
    },
  });
}

// Get a timeline with events
export async function getTimeline(timelineId: string) {
  return prisma.timeline.findUnique({
    where: { id: timelineId },
    include: {
      events: {
        orderBy: { date: 'asc' },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// Get all timelines for a workspace/analysis
export async function getTimelines(options: {
  workspaceId?: string;
  analysisId?: string;
  userId?: string;
}) {
  return prisma.timeline.findMany({
    where: {
      OR: [
        options.workspaceId ? { workspaceId: options.workspaceId } : {},
        options.analysisId ? { analysisId: options.analysisId } : {},
        options.userId ? { createdById: options.userId } : {},
      ].filter((o) => Object.keys(o).length > 0),
    },
    include: {
      _count: {
        select: { events: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

// Add an event to a timeline
export async function addEvent(timelineId: string, event: TimelineEventInput) {
  const newEvent = await prisma.timelineEvent.create({
    data: {
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      type: event.type || 'event',
      category: event.category,
      color: event.color,
      icon: event.icon,
      importance: event.importance || 'medium',
      sourceDocId: event.sourceDocId,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      timelineId,
    },
  });

  // Update timeline date range
  await updateTimelineDateRange(timelineId);

  return newEvent;
}

// Update an event
export async function updateEvent(
  eventId: string,
  data: Partial<TimelineEventInput>
) {
  const event = await prisma.timelineEvent.update({
    where: { id: eventId },
    data: {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });

  // Update timeline date range
  await updateTimelineDateRange(event.timelineId);

  return event;
}

// Delete an event
export async function deleteEvent(eventId: string) {
  const event = await prisma.timelineEvent.delete({
    where: { id: eventId },
  });

  // Update timeline date range
  await updateTimelineDateRange(event.timelineId);

  return event;
}

// Update timeline metadata
export async function updateTimeline(
  timelineId: string,
  data: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return prisma.timeline.update({
    where: { id: timelineId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

// Delete a timeline
export async function deleteTimeline(timelineId: string) {
  return prisma.timeline.delete({
    where: { id: timelineId },
  });
}

// Update timeline date range based on events
async function updateTimelineDateRange(timelineId: string) {
  const events = await prisma.timelineEvent.findMany({
    where: { timelineId },
    orderBy: { date: 'asc' },
  });

  if (events.length === 0) {
    return;
  }

  const startDate = events[0].date;
  const endDate = events[events.length - 1].endDate || events[events.length - 1].date;

  await prisma.timeline.update({
    where: { id: timelineId },
    data: { startDate, endDate },
  });
}

// Extract events from text using AI
export async function extractEventsFromText(
  text: string,
  documentId?: string
): Promise<TimelineEventInput[]> {
  const client = getAnthropicClient();

  if (!client) {
    return mockExtractEvents(text);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze the following text and extract all events, dates, and temporal references. Return a JSON array of events with:
- title: short event name
- description: brief description
- date: ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
- endDate: ISO date string (optional, for events with duration)
- type: 'event' | 'milestone' | 'period' | 'deadline'
- category: topic category (optional)
- importance: 'low' | 'medium' | 'high' | 'critical'

Extract dates mentioned explicitly or inferred from context. For relative dates, estimate based on document context.

Text to analyze:
${text.slice(0, 8000)}

Return ONLY a valid JSON array, no explanation.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          endDate: e.endDate ? new Date(e.endDate) : undefined,
          sourceDocId: documentId,
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to extract events:', error);
    return mockExtractEvents(text);
  }
}

// Mock event extraction
function mockExtractEvents(text: string): TimelineEventInput[] {
  const events: TimelineEventInput[] = [];
  const now = new Date();

  // Simple date pattern matching
  const datePatterns = [
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
  ];

  const monthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let date: Date | null = null;
      const dateStr = match[0];

      // Try to parse the date
      if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(dateStr)) {
        date = new Date(dateStr.replace(/\//g, '-'));
      } else {
        // Parse month name format
        const monthMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const yearMatch = dateStr.match(/\d{4}/);
        const dayMatch = dateStr.match(/\d{1,2}/);

        if (monthMatch && yearMatch && dayMatch) {
          const month = monthMap[monthMatch[0].toLowerCase()];
          const year = parseInt(yearMatch[0]);
          const day = parseInt(dayMatch[0]);
          date = new Date(year, month, day);
        }
      }

      if (date && !isNaN(date.getTime())) {
        // Get surrounding context for title
        const start = Math.max(0, match.index - 50);
        const end = Math.min(text.length, match.index + match[0].length + 50);
        const context = text.slice(start, end).trim();

        events.push({
          title: `Event on ${dateStr}`,
          description: context,
          date,
          type: 'event',
          importance: 'medium',
        });
      }
    }
  }

  // If no events found, add placeholder
  if (events.length === 0) {
    events.push({
      title: 'Document Created',
      description: 'No specific dates found in document',
      date: now,
      type: 'milestone',
      importance: 'low',
    });
  }

  return events;
}

// Build a timeline from document content
export async function buildTimelineFromDocument(
  documentId: string,
  userId: string,
  timelineName?: string
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || !document.content) {
    throw new Error('Document not found or has no content');
  }

  // Extract events
  const extractedEvents = await extractEventsFromText(document.content, documentId);

  // Create timeline
  const timeline = await createTimeline(
    timelineName || `Timeline: ${document.name}`,
    userId,
    { workspaceId: document.workspaceId || undefined }
  );

  // Add events
  for (const event of extractedEvents) {
    await addEvent(timeline.id, event);
  }

  return getTimeline(timeline.id);
}

// Get events in a date range
export async function getEventsInRange(
  timelineId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.timelineEvent.findMany({
    where: {
      timelineId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });
}

// Get events by category
export async function getEventsByCategory(timelineId: string, category: string) {
  return prisma.timelineEvent.findMany({
    where: {
      timelineId,
      category,
    },
    orderBy: { date: 'asc' },
  });
}

// Merge multiple timelines
export async function mergeTimelines(
  timelineIds: string[],
  newName: string,
  userId: string
) {
  // Get all timelines
  const timelines = await Promise.all(
    timelineIds.map((id) => getTimeline(id))
  );

  // Create new timeline
  const merged = await createTimeline(newName, userId);

  // Add all events from all timelines
  for (const timeline of timelines) {
    if (!timeline) continue;

    for (const event of timeline.events) {
      await addEvent(merged.id, {
        title: event.title,
        description: event.description || undefined,
        date: event.date,
        endDate: event.endDate || undefined,
        type: event.type as any,
        category: event.category || undefined,
        color: event.color || undefined,
        icon: event.icon || undefined,
        importance: event.importance as any,
        sourceDocId: event.sourceDocId || undefined,
        metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
      });
    }
  }

  return getTimeline(merged.id);
}
