import { useState, useRef, useEffect, useCallback } from 'react';
import { RecorderStatus } from '../types';


interface UseAudioRecorderReturn {
    status: RecorderStatus;
    duration: number;
    audioUrl: string | null;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    clearRecording: () => void;
    getAudioFile: () => File | null;
}


export const useAudioRecorder = (
    maxDurationSeconds: number = 3600,
    onRecordingComplete?: (file: File) => void 
): UseAudioRecorderReturn => {
  
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);


    const getFormattedFileName = (): string => {
        const now = new Date();
    
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); 
        const day = String(now.getDate()).padStart(2, '0');
    
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        return `recording_${year}-${month}-${day}_${hours}-${minutes}.webm`;
    };


    const stopTimer = () => {
        if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
        }
    };


    const startTimer = () => {
        stopTimer();
        startTimeRef.current = Date.now() - pausedTimeRef.current;
    
        timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      
        if (elapsed >= maxDurationSeconds) {
            stopRecording();
        }
        }, 1000);
    };


    const clearRecording = useCallback(() => {
        stopTimer();
        setDuration(0);
        setAudioUrl(null);
        setError(null);
        setStatus('idle');
        chunksRef.current = [];
        pausedTimeRef.current = 0;
    
        if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        }
        mediaRecorderRef.current = null; 
    }, [audioUrl]);


    const startRecording = async () => {
        try {
            setError(null);
        
            if (!streamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    } 
                });
                streamRef.current = stream;
            }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';

        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });

            // URL для превью
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setStatus('finished');
            stopTimer();

            // File объект для отправки на сервер
            const file = new File([blob], `${getFormattedFileName()}`, { 
                type: mimeType,
                lastModified: Date.now()
            });

            if (onRecordingComplete) {
                onRecordingComplete(file);
            }
        };

        recorder.onerror = (e) => {
            setError('Ошибка записи');
            setStatus('error');
            stopTimer();
        };

        recorder.start(1000);
        setStatus('recording');
        pausedTimeRef.current = 0;
        startTimer();

    } catch (err: any) {
        console.error(err);
        if (err.name === 'NotAllowedError') {
            setError('Доступ к микрофону запрещен.');
        } else if (err.name === 'NotFoundError') {
            setError('Микрофон не найден.');
        } else {
            setError('Не удалось начать запись.');
        }
        setStatus('error');
        }
    };


    const stopRecording = () => {
        if (mediaRecorderRef.current && (status === 'recording' || status === 'paused')) {
            mediaRecorderRef.current.stop();
        }
    };


    const pauseRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.pause();
            setStatus('paused');
            pausedTimeRef.current = Date.now() - startTimeRef.current;
            stopTimer();
        }
    };


    const resumeRecording = () => {
        if (mediaRecorderRef.current && status === 'paused') {
            mediaRecorderRef.current.resume();
            setStatus('recording');
            startTimer();
        }
    };


    useEffect(() => {
        return () => {
            stopTimer();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, []);


    const createFile = (fileName: string = 'recording.webm'): File | null => {
        if (chunksRef.current.length === 0) return null;
        
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
    };
  

  return {
    status,
    duration,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    getAudioFile: () => status === 'finished' ? createFile() : null
  };
};