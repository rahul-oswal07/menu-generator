import React from 'react';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  currentStage?: string;
  estimatedTimeRemaining?: number;
  showPercentage?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  currentStage,
  estimatedTimeRemaining,
  showPercentage = true
}) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="progress-indicator">
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      
      <div className="progress-info">
        {showPercentage && (
          <span className="progress-percentage">
            {Math.round(progress)}%
          </span>
        )}
        
        {currentStage && (
          <span className="progress-stage">
            {currentStage}
          </span>
        )}
        
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
          <span className="progress-time">
            ~{formatTime(estimatedTimeRemaining)} remaining
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;