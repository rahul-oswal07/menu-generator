import React from 'react';
import './NoResultsFallback.css';

interface NoResultsFallbackProps {
  onRetry?: () => void;
  onUploadNew?: () => void;
  showTroubleshooting?: boolean;
}

const NoResultsFallback: React.FC<NoResultsFallbackProps> = ({
  onRetry,
  onUploadNew,
  showTroubleshooting = true
}) => {
  return (
    <div className="no-results-fallback">
      <div className="fallback-icon">
        <span className="icon-emoji">🔍</span>
        <span className="icon-emoji secondary">🍽️</span>
      </div>
      
      <div className="fallback-content">
        <h2>No dishes detected</h2>
        <p className="fallback-description">
          We couldn't find any menu items in your image. This might happen if the text 
          isn't clear enough or the image quality needs improvement.
        </p>
        
        <div className="fallback-actions">
          {onRetry && (
            <button className="fallback-button primary" onClick={onRetry}>
              Try Processing Again
            </button>
          )}
          {onUploadNew && (
            <button className="fallback-button secondary" onClick={onUploadNew}>
              Upload Different Image
            </button>
          )}
        </div>
        
        {showTroubleshooting && (
          <div className="troubleshooting-tips">
            <h3>💡 Tips for better results:</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">📸</div>
                <div className="tip-content">
                  <h4>Image Quality</h4>
                  <p>Use a high-resolution image with clear, readable text</p>
                </div>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">💡</div>
                <div className="tip-content">
                  <h4>Good Lighting</h4>
                  <p>Ensure the menu is well-lit without shadows or glare</p>
                </div>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">🎯</div>
                <div className="tip-content">
                  <h4>Focus & Clarity</h4>
                  <p>Make sure the menu text is in focus and not blurry</p>
                </div>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">📐</div>
                <div className="tip-content">
                  <h4>Proper Angle</h4>
                  <p>Take the photo straight-on, not at an extreme angle</p>
                </div>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">🔤</div>
                <div className="tip-content">
                  <h4>Text Visibility</h4>
                  <p>Ensure menu text is clearly visible and not cut off</p>
                </div>
              </div>
              
              <div className="tip-card">
                <div className="tip-icon">📏</div>
                <div className="tip-content">
                  <h4>File Size</h4>
                  <p>Keep images under 10MB for optimal processing</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="help-section">
          <h4>Still having trouble?</h4>
          <p>
            Try uploading a different section of the menu or ensure the image 
            contains clear dish names and descriptions. The AI works best with 
            traditional menu layouts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoResultsFallback;