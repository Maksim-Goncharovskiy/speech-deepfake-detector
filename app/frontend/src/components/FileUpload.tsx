import React, { useCallback, useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  maxSizeMB?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  maxSizeMB = 100
}) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = useCallback((file: File) => {
    if (!file) return false;

    const acceptedTypes = ['audio/'];
    const isAcceptedType = acceptedTypes.some(type => file.type.includes(type));
    
    if (!isAcceptedType) {
      alert('Пожалуйста, загрузите аудиофайл');
      return false;
    }

    if (file.size > maxSizeBytes) {
      alert(`Файл слишком большой. Максимальный размер: ${maxSizeMB} МБ`);
      return false;
    }

    return true;
  }, [maxSizeBytes, maxSizeMB]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (handleFileValidation(file)) {
      onFileSelect(file);
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onFileSelect, handleFileValidation]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (handleFileValidation(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, handleFileValidation]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="file-upload">
      <div 
        className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          accept="audio/*"
          onChange={handleFileChange}
          className="visually-hidden"
        />
        <div className="upload-content">
          <span className="upload-icon">📁</span>
          <span className="upload-text">
            {selectedFile 
              ? selectedFile.name 
              : 'Перетащите аудио файл сюда или нажмите для выбора'
            }
          </span>
          <p className="upload-hint">
            Максимальный размер: {maxSizeMB} МБ
          </p>
        </div>
      </div>
      {selectedFile && (
        <div className="file-info">
          <p>Файл: {selectedFile.name}</p>
          <p>Размер: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
          <p>Тип: {selectedFile.type}</p>
        </div>
      )}
      <style>{`
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        .upload-area {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background-color: #fafafa;
        }
        
        .upload-area:hover,
        .upload-area.drag-over {
          border-color: #007bff;
          background-color: #e8f4ff;
        }
        
        .upload-area.drag-over {
          border-width: 3px;
          border-color: #007bff;
          transform: scale(1.02);
        }
        
        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .upload-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        
        .upload-text {
          font-size: 1.1rem;
          color: #333;
          font-weight: 500;
        }
        
        .upload-hint {
          font-size: 0.9rem;
          color: #666;
          margin: 0.2rem 0;
        }
        
        .file-info {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
          border-left: 4px solid #007bff;
        }
      `}</style>
    </div>
  );
};

export default FileUpload;