import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  error: string | null;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  showTroubleshooting?: boolean;
}

interface TroubleshootingTip {
  title: string;
  description: string;
  action?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  type = 'error',
  onRetry,
  onDismiss,
  showTroubleshooting = false
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const getTroubleshootingTips = (errorMessage: string): TroubleshootingTip[] => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return [
        {
          title: 'Check your internet connection',
          description: 'Make sure you have a stable internet connection and try again.'
        },
        {
          title: 'Refresh the page',
          description: 'Sometimes a simple page refresh can resolve connection issues.',
          action: 'Refresh Page'
        }
      ];
    }
    
    if (lowerError.includes('file') || lowerError.includes('upload')) {
      return [
        {
          title: 'Check file format',
          description: 'Make sure your image is in JPEG, PNG, or WEBP format.'
        },
        {
          title: 'Check file size',
          description: 'Ensure your image is under 10MB in size.'
        },
        {
          title: 'Try a different image',
          description: 'If the problem persists, try uploading a different menu image.'
        }
      ];
    }
    
    if (lowerError.includes('ocr') || lowerError.includes('text')) {
      return [
        {
          title: 'Improve image quality',
          description: 'Use a high-resolution image with clear, readable text.'
        },
        {
          title: 'Ensure good lighting',
          description: 'Make sure the menu is well-lit without shadows or glare.'
        },
        {
          title: 'Check text visibility',
          description: 'Verify that menu text is clearly visible and not blurry.'
        }
      ];
    }
    
    if (lowerError.includes('generation') || lowerError.includes('image')) {
      return [
        {
          title: 'Try again later',
          description: 'Image generation services may be temporarily busy.'
        },
        {
          title: 'Check menu item details',
          description: 'Make sure the dish name and description are clear and descriptive.'
        }
      ];
    }
    
    return [
      {
        title: 'Try refreshing the page',
        description: 'A page refresh often resolves temporary issues.',
        action: 'Refresh Page'
      },
      {
        title: 'Check your connection',
        description: 'Ensure you have a stable internet connection.'
      }
    ];
  };

  const troubleshootingTips = showTroubleshooting ? getTroubleshootingTips(error) : [];

  const handleActionClick = (action: string) => {
    if (action === 'Refresh Page') {
      window.location.reload();
    }
  };

  return (
    <div className={`error-message ${type}`}>
      <div className="error-header">
        <span className="error-icon">{getErrorIcon()}</span>
        <div className="error-content">
          <div className="error-text">{error}</div>
          <div className="error-actions">
            {onRetry && (
              <button className="error-button retry-button" onClick={onRetry}>
                Try Again
              </button>
            )}
            {onDismiss && (
              <button className="error-button dismiss-button" onClick={onDismiss}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
      
      {troubleshootingTips.length > 0 && (
        <div className="troubleshooting-section">
          <h4>Troubleshooting Tips:</h4>
          <ul className="troubleshooting-list">
            {troubleshootingTips.map((tip, index) => (
              <li key={index} className="troubleshooting-item">
                <strong>{tip.title}:</strong> {tip.description}
                {tip.action && (
                  <button 
                    className="tip-action-button"
                    onClick={() => handleActionClick(tip.action!)}
                  >
                    {tip.action}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;