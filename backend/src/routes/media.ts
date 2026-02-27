import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import * as mediaService from '../services/mediaService.js';

const router = Router();

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/media');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for media files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/webm',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and video files are allowed.'));
    }
  },
});

// Get all media files
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { workspaceId, analysisId, type } = req.query;

    const files = await mediaService.getMediaFiles({
      workspaceId: workspaceId as string,
      analysisId: analysisId as string,
      userId: req.user!.id,
      type: type as 'audio' | 'video' | undefined,
    });

    res.json({ files });
  } catch (error) {
    console.error('Get media files error:', error);
    res.status(500).json({ error: 'Failed to get media files' });
  }
});

// Get a specific media file
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const media = await mediaService.getMediaFile(req.params.id);

    if (!media) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.json({ media });
  } catch (error) {
    console.error('Get media file error:', error);
    res.status(500).json({ error: 'Failed to get media file' });
  }
});

// Upload a media file
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { workspaceId, analysisId, duration } = req.body;

    // Determine if it's audio or video
    const type = req.file.mimetype.startsWith('video/') ? 'video' : 'audio';

    const media = await mediaService.createMediaFile(
      req.file.originalname,
      type,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      req.user!.id,
      {
        duration: duration ? parseFloat(duration) : undefined,
        workspaceId,
        analysisId,
      }
    );

    res.status(201).json({ media });
  } catch (error: any) {
    console.error('Upload media error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload media file' });
  }
});

// Start transcription
router.post('/:id/transcribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await mediaService.startTranscription(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Start transcription error:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Get transcription status
router.get('/:id/transcription', authenticate, async (req: AuthRequest, res) => {
  try {
    const media = await mediaService.getMediaFile(req.params.id);

    if (!media) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.json({
      status: media.transcriptionStatus,
      transcription: media.transcription,
      segments: media.segments,
      meta: media.transcriptionMeta ? JSON.parse(media.transcriptionMeta) : null,
    });
  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({ error: 'Failed to get transcription' });
  }
});

// Get transcript as text
router.get('/:id/transcript/text', authenticate, async (req: AuthRequest, res) => {
  try {
    const text = await mediaService.getTranscriptText(req.params.id);

    res.setHeader('Content-Type', 'text/plain');
    res.send(text);
  } catch (error) {
    console.error('Get transcript text error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// Export transcript to SRT
router.get('/:id/transcript/srt', authenticate, async (req: AuthRequest, res) => {
  try {
    const media = await mediaService.getMediaFile(req.params.id);

    if (!media) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const srt = mediaService.exportToSRT(media.segments);

    res.setHeader('Content-Type', 'text/srt');
    res.setHeader('Content-Disposition', `attachment; filename="${media.name}.srt"`);
    res.send(srt);
  } catch (error) {
    console.error('Export SRT error:', error);
    res.status(500).json({ error: 'Failed to export SRT' });
  }
});

// Export transcript to VTT
router.get('/:id/transcript/vtt', authenticate, async (req: AuthRequest, res) => {
  try {
    const media = await mediaService.getMediaFile(req.params.id);

    if (!media) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const vtt = mediaService.exportToVTT(media.segments);

    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Content-Disposition', `attachment; filename="${media.name}.vtt"`);
    res.send(vtt);
  } catch (error) {
    console.error('Export VTT error:', error);
    res.status(500).json({ error: 'Failed to export VTT' });
  }
});

// Search transcription
router.get('/:id/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const results = await mediaService.searchTranscription(req.params.id, q as string);

    res.json(results);
  } catch (error) {
    console.error('Search transcription error:', error);
    res.status(500).json({ error: 'Failed to search transcription' });
  }
});

// Analyze transcript
router.get('/:id/analyze', authenticate, async (req: AuthRequest, res) => {
  try {
    const analysis = await mediaService.analyzeTranscript(req.params.id);
    res.json({ analysis });
  } catch (error: any) {
    console.error('Analyze transcript error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze transcript' });
  }
});

// Update a segment
router.patch('/segments/:segmentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text, speaker, notes, tags } = req.body;

    const segment = await mediaService.updateSegment(req.params.segmentId, {
      text,
      speaker,
      notes,
      tags,
    });

    res.json({ segment });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

// Add a manual segment
router.post('/:id/segments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startTime, endTime, text, speaker } = req.body;

    if (startTime === undefined || endTime === undefined || !text) {
      return res.status(400).json({ error: 'startTime, endTime, and text are required' });
    }

    const segment = await mediaService.addSegment(req.params.id, {
      startTime,
      endTime,
      text,
      speaker,
    });

    res.status(201).json({ segment });
  } catch (error) {
    console.error('Add segment error:', error);
    res.status(500).json({ error: 'Failed to add segment' });
  }
});

// Delete a segment
router.delete('/segments/:segmentId', authenticate, async (req: AuthRequest, res) => {
  try {
    await mediaService.deleteSegment(req.params.segmentId);
    res.json({ message: 'Segment deleted' });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

// Update media file metadata
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, duration } = req.body;

    const media = await mediaService.updateMediaFile(req.params.id, {
      name,
      duration,
    });

    res.json({ media });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ error: 'Failed to update media file' });
  }
});

// Delete a media file
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await mediaService.deleteMediaFile(req.params.id);
    res.json({ message: 'Media file deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media file' });
  }
});

export default router;
