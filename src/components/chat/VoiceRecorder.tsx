import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Mic, MicOff, Send, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  isRecording: boolean;
  onStop: () => void;
  onSend: (audioUrl: string) => void;
}

export function VoiceRecorder({ isRecording, onStop, onSend }: VoiceRecorderProps) {
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao acessar o microfone');
      onStop();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    onStop();
  };

  const playRecording = () => {
    if (!recordedUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(recordedUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const sendRecording = async () => {
    if (recordedBlob && onSend) {
      try {
        // Create a File from the blob
        const audioFile = new File([recordedBlob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        
        // Create blob URL for immediate use
        const blobUrl = URL.createObjectURL(recordedBlob);
        onSend(blobUrl);
        clearRecording();
      } catch (error) {
        console.error('Error sending voice message:', error);
        toast.error('Erro ao enviar mensagem de voz');
      }
    }
  };

  const clearRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center animate-pulse">
                <Mic className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping"></div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Gravando áudio</h3>
              <p className="text-2xl font-mono text-red-500">
                {formatTime(recordingTime)}
              </p>
            </div>
            
            <Button
              onClick={stopRecording}
              variant="outline"
              className="gap-2"
            >
              <MicOff className="w-4 h-4" />
              Parar Gravação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (recordedUrl) {
    return (
      <Dialog open={true} onOpenChange={() => clearRecording()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Áudio gravado</h3>
              <p className="text-muted-foreground">
                Duração: {formatTime(recordingTime)}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={playRecording}
                variant="outline"
                size="icon"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={clearRecording}
                variant="outline"
                size="icon"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={sendRecording}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}