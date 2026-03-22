import React from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';


interface AudioRecorderProps {
    onAudioRecorded: (file: File) => void;
    onClear: () => void;
    disabled?: boolean;
    maxDurationSeconds?: number;
}


const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};


const AudioRecorder: React.FC<AudioRecorderProps> = ({
    onAudioRecorded,
    onClear,
    disabled = false,
    maxDurationSeconds = 15,
}) => {
  const {
    status,
    duration,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    getAudioFile
  } = useAudioRecorder(maxDurationSeconds, (file) => {
    onAudioRecorded(file);
  });

    const handleStop = () => {
        stopRecording();
    };

    const handleClear = () => {
        clearRecording();
        onClear();
    };

    const isRecording = status === 'recording';
    const isPaused = status === 'paused';
    const isFinished = status === 'finished';
    const hasError = status === 'error';


    if (!navigator.mediaDevices || !window.MediaRecorder) {
        return (
        <div className="recorder-error">
            ⚠️ Ваш браузер не поддерживает запись аудио. Пожалуйста, загрузите файл.
        </div>
        );
    }

    return (
        <div className="audio-recorder-container">
        <div className="recorder-status">
            {isRecording && <span className="status-indicator recording">● Запись</span>}
            {isPaused && <span className="status-indicator paused">⏸ На паузе</span>}
            {isFinished && <span className="status-indicator finished">✓ Готово к отправке</span>}
            {hasError && <span className="status-indicator error">⚠ Ошибка</span>}
            {!isRecording && !isPaused && !isFinished && !hasError && (
            <span className="status-indicator idle">Ожидание</span>
            )}
        </div>

        <div className="recorder-timer">{formatTime(duration)}</div>

        {error && <div className="recorder-error-message">{error}</div>}

        <div className="recorder-controls">
            {!isFinished && !isRecording && !isPaused && (
                <button 
                    type="button" 
                    className="btn-record" 
                    onClick={startRecording}
                    disabled={disabled}
                >
                    🎤 Начать запись
                </button>
            )}

        {isRecording && (
            <>
                <button type="button" className="btn-pause" onClick={pauseRecording}>
                    ⏸ Пауза
                </button>
                <button type="button" className="btn-stop" onClick={handleStop}>
                    ⏹ Стоп
                </button>
            </>
        )}

        {isPaused && (
            <>
                <button type="button" className="btn-resume" onClick={resumeRecording}>
                    ▶ Продолжить
                </button>
                <button type="button" className="btn-stop" onClick={handleStop}>
                    ⏹ Стоп
                </button>
            </>
        )}

        {isFinished && audioUrl && (
            <div className="recorder-preview">
                <audio controls src={audioUrl} className="audio-player" />
                <div className="recorder-actions">
                    <button type="button" className="btn-retry" onClick={handleClear}>
                        🔄 Записать заново
                    </button>
                </div>
            </div>
        )}
      </div>
      
        <p className="recorder-hint">
            Максимальная длительность: {Math.floor(maxDurationSeconds)} cек.
        </p>
    </div>
  );
};

export default AudioRecorder;