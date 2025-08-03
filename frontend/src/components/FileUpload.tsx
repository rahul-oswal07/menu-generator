import React, { useState, useRef, useCallback } from 'react';
import { FileUploadState } from '../types';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  uploadState: FileUploadState;
  disabled?: boolean;
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  uploadState,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WEBP image file.';
    }

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return `File size too large. Maximum allowed size is 10MB. Your file is ${fileSizeMB}MB.`;
    }

    return null;
  }, []);

  const handleFileSelection = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      // Error will be handled by parent component
      return;
    }

    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploadState.isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, uploadState.isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || uploadState.isUploading) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [disabled, uploadState.isUploading, handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleClick = useCallback(() => {
    if (!disabled && !uploadState.isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, uploadState.isUploading]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${uploadState.isUploading ? 'uploading' : ''
          } ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="Upload menu image"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled || uploadState.isUploading}
        />

        {uploadState.isUploading ? (
          <div className="upload-progress">
            <div className="upload-spinner"></div>
            <p>Uploading your menu image...</p>
            {uploadState.uploadProgress > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadState.uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : uploadState.file ? (
          <div className="file-selected">
            <div className="file-info">
              <span className="file-name">{uploadState.file.name}</span>
              <span className="file-size">{formatFileSize(uploadState.file.size)}</span>
            </div>
            {uploadState.preview && (
              <div className="image-preview">
                <img src={uploadState.preview} alt="Menu preview" />
              </div>
            )}
            <p className="upload-hint">Click to select a different image</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <h3>Upload Menu Image</h3>
            <p>Drag and drop your menu image here, or click to select</p>
            <div className="upload-requirements">
              <p>Supported formats: JPEG, PNG, WEBP</p>
              <p>Maximum size: 10MB</p>
            </div>
          </div>
        )}
      </div>

      {uploadState.error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{uploadState.error}</span>
        </div>
      )}
    </div>
  );
};