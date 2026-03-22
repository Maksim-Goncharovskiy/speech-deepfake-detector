import React, { useEffect, useState } from 'react';
import FileUpload from './components/FileUpload';
import AudioRecorder from './components/AudioRecorder';
import { analyzeAudioFile } from './services/api';
import { Prediction } from './types';
import './App.css';


type InputMode = 'upload' | 'recorder';


const AppContent: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  

  const handleFileUpdate = (file: File) => {
    setFile(file);
    setPrediction(null);
    setErrorMessage(null); 
    setIsAnalyzing(false);
  };


  const handleClearAudio = () => {
    setFile(null);
    setPrediction(null);
    setErrorMessage(null);
    setIsAnalyzing(false);
  };


  const handleModeSwitch = (mode: InputMode) => {
    setInputMode(mode);
    setFile(null);
  };


  const handleFormSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Пожалуйста, выберите файл для обработки или воспользуйтесь диктофоном');
      return;
    }
    setIsLoading(true);
    setUploadProgress(0); 
    setIsAnalyzing(false);
    try {
      const response = await analyzeAudioFile(
        file,
        (progress: number) => {
          setUploadProgress(progress);
          if (progress === 100) {
              setIsAnalyzing(true);
          }
        }
      );
      setPrediction(response); 
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
      setErrorMessage(msg);
      console.error('Ошибка при отправке файла:', error);
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPrediction(null);
    setErrorMessage(null);
    setFile(null);
    setUploadProgress(null);
  };

  const isFormValid = file;
  
  return (
    <div className="app">
      <div className="app-container">
        <div className="upload-form">
          <p style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }} className="MuiTypography-root MuiTypography-body1 css-1o7a71b-MuiTypography-root">
            Детектор клонированной речи
          </p>

          <form onSubmit={handleFormSubmit}>
            {/* Выбор режима ввода */}
            <div className="form-section">
              <div className="input-mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${inputMode === 'upload' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('upload')}
                >
                  📁 Загрузить файл
                </button>
                <button
                  type="button"
                  className={`mode-btn ${inputMode === 'recorder' ? 'active' : ''}`}
                  onClick={() => handleModeSwitch('recorder')}
                >
                  🎤 Диктофон
                </button>
              </div>

              {inputMode === 'upload' ? (
                <FileUpload
                  onFileSelect={handleFileUpdate}
                  selectedFile={file}
                  maxSizeMB={100}
                />
              ) : (
                <AudioRecorder
                  onAudioRecorded={handleFileUpdate}
                  onClear={handleClearAudio}
                  disabled={isLoading}
                  maxDurationSeconds={15} 
                />
              )}
              
              {/* Отображение выбранного файла/записи */}
              {file && (
                <div className="selected-file-info">
                  ✅ Выбрано: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            
            {(prediction || errorMessage) && (
            <div className={`result-card ${prediction?.label === 'fake' ? 'result-fake' : prediction?.label === 'real' ? 'result-real' : 'result-error'}`}>
              {errorMessage ? (
                <div className="result-content error-state">
                  <span className="result-icon">⚠️</span>
                  <div className="result-text">
                    <h3>Ошибка анализа</h3>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              ) : prediction && (
                <div className="result-content success-state">
                  <span className="result-icon">
                    {prediction.label === 'fake' ? '🤖' : '👤'}
                  </span>
                  <div className="result-text">
                    <h3>
                      {prediction.label === 'fake' ? 'Дипфейк' : 'Реальный голос'}
                    </h3>
                    <p className="confidence-label">
                      Уверенность модели: 
                      <span className={`confidence-badge confidence-${prediction.confidence}`}>
                        {prediction.confidence === 'high' ? 'Высокая' : prediction.confidence === 'medium' ? 'Средняя' : 'Низкая'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={isLoading || (!file && !prediction && !errorMessage)}
                className={`submit-button ${prediction || errorMessage ? 'reset-button' : ''}`}
              >
                {isLoading ? (
                  isAnalyzing ? (
                    <div className="button-loading analyzing-state">
                      <div className="spinner-simple"></div>
                      <span className="progress-label">Анализ...</span>
                    </div>
                  ) : (
                    <div className="button-loading">
                      <div className="progress-ring-wrapper">
                        <svg className="progress-ring" viewBox="0 0 36 36">
                          <circle className="progress-ring-bg" cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" strokeWidth="3"/>
                          <circle 
                            className="progress-ring-fill" 
                            cx="18" cy="18" r="16" fill="none" 
                            stroke="#ffffff" strokeWidth="3"
                            strokeDasharray="100"
                            strokeDashoffset={100 - (uploadProgress || 0)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="progress-text">{Math.round(uploadProgress || 0)}%</span>
                      </div>
                      <span className="progress-label">Загрузка...</span>
                    </div>
                  )
                ) : prediction || errorMessage ? (
                  '🔄 Проанализировать снова'
                ) : (
                  '🔍 Проанализировать'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  return (<AppContent />);
};

export default App;