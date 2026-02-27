'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Mic,
  FileText,
  Search,
  Download,
  Edit,
  Check,
  X,
  User,
  Loader2,
  Brain,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface MediaSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
  isEdited?: boolean;
  notes?: string;
}

interface MediaPlayerProps {
  mediaId: string;
  onClose?: () => void;
}

export function MediaPlayer({ mediaId, onClose }: MediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [media, setMedia] = useState<{
    id: string;
    name: string;
    type: 'audio' | 'video';
    path: string;
    duration?: number;
    transcriptionStatus: string;
    transcription?: string;
    segments: MediaSegment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaSegment[]>([]);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<{
    summary: string;
    topics: string[];
    keyPoints: string[];
    actionItems: string[];
    sentiment: string;
  } | null>(null);
  const [analyzingTranscript, setAnalyzingTranscript] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, [mediaId]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const { media: fetchedMedia } = await api.getMediaFile(mediaId);
      setMedia(fetchedMedia);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTranscription = async () => {
    if (!media) return;
    try {
      await api.startTranscription(mediaId);
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const { status, segments } = await api.getTranscription(mediaId);
        if (status === 'completed' || status === 'failed') {
          clearInterval(pollInterval);
          fetchMedia();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  const handleTimeUpdate = () => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      setCurrentTime(mediaEl.currentTime);

      // Find active segment
      const active = media?.segments.find(
        (s) => mediaEl.currentTime >= s.startTime && mediaEl.currentTime < s.endTime
      );
      setActiveSegment(active?.id || null);
    }
  };

  const handleLoadedMetadata = () => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      setDuration(mediaEl.duration);
    }
  };

  const togglePlay = () => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      if (isPlaying) {
        mediaEl.pause();
      } else {
        mediaEl.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      mediaEl.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number) => {
    handleSeek(Math.max(0, Math.min(duration, currentTime + seconds)));
  };

  const toggleMute = () => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      mediaEl.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    const mediaEl = media?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaEl) {
      mediaEl.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
    }
  };

  const jumpToSegment = (segment: MediaSegment) => {
    handleSeek(segment.startTime);
    setActiveSegment(segment.id);
  };

  const handleEditSegment = async (segmentId: string) => {
    if (!editText.trim()) {
      setEditingSegment(null);
      return;
    }

    try {
      await api.updateMediaSegment(segmentId, { text: editText });
      setMedia((prev) =>
        prev
          ? {
              ...prev,
              segments: prev.segments.map((s) =>
                s.id === segmentId ? { ...s, text: editText, isEdited: true } : s
              ),
            }
          : null
      );
      setEditingSegment(null);
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !media) return;
    try {
      const { segments } = await api.searchTranscription(mediaId, searchQuery);
      setSearchResults(segments);
    } catch (error) {
      console.error('Failed to search transcription:', error);
    }
  };

  const handleAnalyzeTranscript = async () => {
    setAnalyzingTranscript(true);
    try {
      const { analysis: result } = await api.analyzeTranscript(mediaId);
      setAnalysis(result);
      setShowAnalysis(true);
    } catch (error) {
      console.error('Failed to analyze transcript:', error);
    } finally {
      setAnalyzingTranscript(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!media) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full">
          <Mic className="h-12 w-12 text-foreground-tertiary mb-4" />
          <p className="text-foreground-secondary">Media file not found</p>
        </CardContent>
      </Card>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const mediaUrl = `${apiUrl.replace('/api', '')}/${media.path}`;

  return (
    <div className="h-full flex flex-col">
      {/* Media Player */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {media.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Video/Audio element */}
          {media.type === 'video' ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full rounded-lg bg-black mb-4"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <audio
              ref={audioRef}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          {/* Progress bar */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-background-tertiary cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <div className="flex justify-between text-xs text-foreground-tertiary mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={() => handleSkip(-10)}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => handleSkip(10)}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 rounded-full appearance-none bg-background-tertiary cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transcription
            </CardTitle>
            <div className="flex items-center gap-2">
              {media.transcriptionStatus === 'completed' && (
                <>
                  <div className="relative">
                    <Input
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-48 h-8 pr-8"
                    />
                    <Search
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary cursor-pointer"
                      onClick={handleSearch}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyzeTranscript}
                    disabled={analyzingTranscript}
                  >
                    {analyzingTranscript ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Brain className="h-4 w-4 mr-1" />
                    )}
                    Analyze
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {media.transcriptionStatus === 'pending' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Mic className="h-12 w-12 text-foreground-tertiary mb-4" />
              <p className="text-foreground-secondary mb-4">No transcription yet</p>
              <Button onClick={handleStartTranscription}>
                <Mic className="h-4 w-4 mr-2" />
                Start Transcription
              </Button>
            </div>
          )}

          {media.transcriptionStatus === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-foreground-secondary">Transcribing audio...</p>
              <p className="text-xs text-foreground-tertiary mt-2">
                This may take a few minutes
              </p>
            </div>
          )}

          {media.transcriptionStatus === 'completed' && (
            <div className="space-y-2">
              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium mb-2">
                    {searchResults.length} results for "{searchQuery}"
                  </p>
                  <div className="space-y-1">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => jumpToSegment(result)}
                        className="block w-full text-left text-sm p-2 rounded hover:bg-primary/10"
                      >
                        <span className="text-foreground-tertiary">
                          [{formatTime(result.startTime)}]
                        </span>{' '}
                        {result.text}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchResults([])}
                    className="mt-2"
                  >
                    Clear results
                  </Button>
                </div>
              )}

              {/* Segments */}
              {media.segments.map((segment) => (
                <div
                  key={segment.id}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg cursor-pointer transition-colors group',
                    activeSegment === segment.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-background-secondary'
                  )}
                  onClick={() => jumpToSegment(segment)}
                >
                  <div className="flex-shrink-0">
                    <span className="text-xs text-foreground-tertiary">
                      {formatTime(segment.startTime)}
                    </span>
                  </div>

                  {segment.speaker && (
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <User className="h-3 w-3 text-foreground-tertiary" />
                      <span className="text-xs text-primary">{segment.speaker}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {editingSegment === segment.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSegment(segment.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSegment(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className={cn('text-sm', segment.isEdited && 'italic')}>
                        {segment.text}
                        {segment.isEdited && (
                          <span className="text-xs text-foreground-tertiary ml-2">(edited)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {segment.confidence && (
                    <div className="flex-shrink-0">
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          segment.confidence > 0.9
                            ? 'bg-green-500/20 text-green-500'
                            : segment.confidence > 0.7
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-red-500/20 text-red-500'
                        )}
                      >
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSegment(segment.id);
                      setEditText(segment.text);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {media.segments.length === 0 && (
                <p className="text-center text-foreground-secondary py-8">
                  No transcription segments available
                </p>
              )}
            </div>
          )}

          {media.transcriptionStatus === 'failed' && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-4">Transcription failed</p>
              <Button onClick={handleStartTranscription}>Try Again</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      <Modal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        title="Transcript Analysis"
        size="lg"
      >
        {analysis && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary
              </h4>
              <p className="text-foreground-secondary">{analysis.summary}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Sentiment</h4>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm capitalize',
                  analysis.sentiment === 'positive' && 'bg-green-500/20 text-green-500',
                  analysis.sentiment === 'negative' && 'bg-red-500/20 text-red-500',
                  analysis.sentiment === 'neutral' && 'bg-gray-500/20 text-gray-500',
                  analysis.sentiment === 'mixed' && 'bg-yellow-500/20 text-yellow-500'
                )}
              >
                {analysis.sentiment}
              </span>
            </div>

            {analysis.topics.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.keyPoints.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Points</h4>
                <ul className="space-y-1">
                  {analysis.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                      <span className="text-primary">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.actionItems.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Action Items</h4>
                <ul className="space-y-1">
                  {analysis.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
