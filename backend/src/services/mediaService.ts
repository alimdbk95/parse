import { prisma } from '../index.js';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs/promises';

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export interface MediaSegmentInput {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

// Create a media file record
export async function createMediaFile(
  name: string,
  type: 'audio' | 'video',
  mimeType: string,
  size: number,
  filePath: string,
  userId: string,
  options: {
    duration?: number;
    thumbnail?: string;
    workspaceId?: string;
    analysisId?: string;
  } = {}
) {
  return prisma.mediaFile.create({
    data: {
      name,
      type,
      mimeType,
      size,
      path: filePath,
      duration: options.duration,
      thumbnail: options.thumbnail,
      transcriptionStatus: 'pending',
      uploadedById: userId,
      workspaceId: options.workspaceId,
      analysisId: options.analysisId,
    },
    include: {
      segments: true,
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// Get a media file with segments
export async function getMediaFile(mediaId: string) {
  return prisma.mediaFile.findUnique({
    where: { id: mediaId },
    include: {
      segments: {
        orderBy: { startTime: 'asc' },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// Get all media files
export async function getMediaFiles(options: {
  workspaceId?: string;
  analysisId?: string;
  userId?: string;
  type?: 'audio' | 'video';
}) {
  return prisma.mediaFile.findMany({
    where: {
      AND: [
        options.type ? { type: options.type } : {},
        {
          OR: [
            options.workspaceId ? { workspaceId: options.workspaceId } : {},
            options.analysisId ? { analysisId: options.analysisId } : {},
            options.userId ? { uploadedById: options.userId } : {},
          ].filter((o) => Object.keys(o).length > 0),
        },
      ],
    },
    include: {
      _count: {
        select: { segments: true },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Start transcription process (mock implementation)
export async function startTranscription(mediaId: string) {
  // Update status to processing
  await prisma.mediaFile.update({
    where: { id: mediaId },
    data: { transcriptionStatus: 'processing' },
  });

  // In a real implementation, this would:
  // 1. Send the audio/video file to a transcription service (e.g., OpenAI Whisper, AssemblyAI)
  // 2. Wait for the transcription to complete
  // 3. Store the results

  // For demo, simulate with mock transcription after a delay
  setTimeout(async () => {
    try {
      const media = await prisma.mediaFile.findUnique({
        where: { id: mediaId },
      });

      if (!media) return;

      // Generate mock transcription segments
      const duration = media.duration || 120;
      const segments = generateMockTranscription(duration);

      // Save segments
      for (const segment of segments) {
        await prisma.mediaSegment.create({
          data: {
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            speaker: segment.speaker,
            confidence: segment.confidence,
            mediaId,
          },
        });
      }

      // Combine all text for full transcription
      const fullTranscription = segments.map((s) => s.text).join(' ');

      // Update media file
      await prisma.mediaFile.update({
        where: { id: mediaId },
        data: {
          transcriptionStatus: 'completed',
          transcription: fullTranscription,
          transcriptionMeta: JSON.stringify({
            wordCount: fullTranscription.split(' ').length,
            segmentCount: segments.length,
            speakers: [...new Set(segments.map((s) => s.speaker))],
            processedAt: new Date().toISOString(),
          }),
        },
      });
    } catch (error) {
      console.error('Transcription failed:', error);
      await prisma.mediaFile.update({
        where: { id: mediaId },
        data: { transcriptionStatus: 'failed' },
      });
    }
  }, 3000); // Simulate 3 second processing time

  return { status: 'processing', message: 'Transcription started' };
}

// Generate mock transcription segments
function generateMockTranscription(duration: number): MediaSegmentInput[] {
  const segments: MediaSegmentInput[] = [];
  const speakers = ['Speaker 1', 'Speaker 2'];
  const sampleTexts = [
    "Let's begin by looking at the data from last quarter.",
    "The numbers show a significant increase in user engagement.",
    "We've seen growth across all major metrics.",
    "However, there are some areas that need attention.",
    "The conversion rate has remained relatively stable.",
    "I think we should focus on improving the onboarding process.",
    "User feedback has been overwhelmingly positive.",
    "We're on track to meet our annual goals.",
    "The new features have been well received.",
    "Let me share some specific examples.",
    "Looking at the regional breakdown, we see interesting patterns.",
    "This data suggests we should expand our efforts.",
  ];

  let currentTime = 0;
  let textIndex = 0;

  while (currentTime < duration) {
    const segmentDuration = 5 + Math.random() * 10; // 5-15 seconds per segment
    const endTime = Math.min(currentTime + segmentDuration, duration);

    segments.push({
      startTime: currentTime,
      endTime,
      text: sampleTexts[textIndex % sampleTexts.length],
      speaker: speakers[textIndex % 2],
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0 confidence
    });

    currentTime = endTime;
    textIndex++;
  }

  return segments;
}

// Update a segment
export async function updateSegment(
  segmentId: string,
  data: {
    text?: string;
    speaker?: string;
    notes?: string;
    tags?: string[];
  }
) {
  return prisma.mediaSegment.update({
    where: { id: segmentId },
    data: {
      text: data.text,
      speaker: data.speaker,
      notes: data.notes,
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
      isEdited: data.text !== undefined,
      updatedAt: new Date(),
    },
  });
}

// Add a manual segment
export async function addSegment(mediaId: string, segment: MediaSegmentInput) {
  return prisma.mediaSegment.create({
    data: {
      startTime: segment.startTime,
      endTime: segment.endTime,
      text: segment.text,
      speaker: segment.speaker,
      confidence: segment.confidence,
      mediaId,
    },
  });
}

// Delete a segment
export async function deleteSegment(segmentId: string) {
  return prisma.mediaSegment.delete({
    where: { id: segmentId },
  });
}

// Search transcription
export async function searchTranscription(
  mediaId: string,
  query: string
): Promise<{ segments: any[]; matches: number }> {
  const segments = await prisma.mediaSegment.findMany({
    where: {
      mediaId,
      text: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: { startTime: 'asc' },
  });

  return {
    segments,
    matches: segments.length,
  };
}

// Get transcript as text
export async function getTranscriptText(mediaId: string): Promise<string> {
  const segments = await prisma.mediaSegment.findMany({
    where: { mediaId },
    orderBy: { startTime: 'asc' },
  });

  return segments.map((s) => {
    const timestamp = formatTimestamp(s.startTime);
    const speaker = s.speaker ? `[${s.speaker}]` : '';
    return `${timestamp} ${speaker} ${s.text}`;
  }).join('\n');
}

// Format timestamp (seconds to HH:MM:SS)
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Export transcript to SRT format
export function exportToSRT(segments: any[]): string {
  return segments.map((segment, index) => {
    const startTime = formatSRTTimestamp(segment.startTime);
    const endTime = formatSRTTimestamp(segment.endTime);

    return `${index + 1}
${startTime} --> ${endTime}
${segment.text}
`;
  }).join('\n');
}

// Format timestamp for SRT (HH:MM:SS,mmm)
function formatSRTTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Export transcript to VTT format
export function exportToVTT(segments: any[]): string {
  const header = 'WEBVTT\n\n';
  const content = segments.map((segment) => {
    const startTime = formatVTTTimestamp(segment.startTime);
    const endTime = formatVTTTimestamp(segment.endTime);

    return `${startTime} --> ${endTime}
${segment.text}
`;
  }).join('\n');

  return header + content;
}

// Format timestamp for VTT (HH:MM:SS.mmm)
function formatVTTTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Analyze transcript with AI
export async function analyzeTranscript(mediaId: string): Promise<{
  summary: string;
  topics: string[];
  keyPoints: string[];
  actionItems: string[];
  sentiment: string;
}> {
  const media = await getMediaFile(mediaId);

  if (!media || !media.transcription) {
    throw new Error('No transcription available');
  }

  const client = getAnthropicClient();

  if (!client) {
    // Mock analysis
    return {
      summary: 'This is a discussion covering various topics related to data analysis and business metrics.',
      topics: ['Data Analysis', 'User Engagement', 'Growth Metrics', 'Product Development'],
      keyPoints: [
        'User engagement has increased significantly',
        'Conversion rates remain stable',
        'Regional patterns show interesting trends',
      ],
      actionItems: [
        'Improve onboarding process',
        'Expand regional efforts',
        'Review user feedback systematically',
      ],
      sentiment: 'positive',
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Analyze this transcript and provide:
1. A brief summary (2-3 sentences)
2. Main topics discussed (list)
3. Key points (list)
4. Action items mentioned (list)
5. Overall sentiment (positive/negative/neutral/mixed)

Return as JSON with keys: summary, topics, keyPoints, actionItems, sentiment

Transcript:
${media.transcription.slice(0, 8000)}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Analyze transcript error:', error);
    // Return mock analysis on error
    return {
      summary: 'Analysis unavailable. Please try again later.',
      topics: [],
      keyPoints: [],
      actionItems: [],
      sentiment: 'unknown',
    };
  }
}

// Delete media file and its segments
export async function deleteMediaFile(mediaId: string) {
  const media = await prisma.mediaFile.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error('Media file not found');
  }

  // Delete the physical file
  try {
    await fs.unlink(media.path);
    if (media.thumbnail) {
      await fs.unlink(media.thumbnail);
    }
  } catch (error) {
    console.error('Failed to delete media files:', error);
    // Continue with database deletion
  }

  // Delete from database (segments will be cascade deleted)
  return prisma.mediaFile.delete({
    where: { id: mediaId },
  });
}

// Update media file metadata
export async function updateMediaFile(
  mediaId: string,
  data: {
    name?: string;
    duration?: number;
  }
) {
  return prisma.mediaFile.update({
    where: { id: mediaId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}
