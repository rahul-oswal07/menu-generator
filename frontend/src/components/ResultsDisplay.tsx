import React, { useState } from 'react';
import { MenuItem, MenuItemModel } from '../types';
import ErrorMessage from './ErrorMessage';
import LazyImage from './LazyImage';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
  results: MenuItemModel[];
  isLoading?: boolean;
  error?: string | null;
  onRetryGeneration?: (itemId: string) => void;
  onSaveImage?: (itemId: string) => void;
  onShareImage?: (itemId: string) => void;
  onRetryProcessing?: () => void;
  onUploadNew?: () => void;
  onDismissError?: () => void;
}

interface DishCardProps {
  menuItem: MenuItem;
  onRetryGeneration?: (itemId: string) => void;
  onSaveImage?: (itemId: string) => void;
  onShareImage?: (itemId: string) => void;
  onImageClick?: (imageUrl: string) => void;
}

const DishCard: React.FC<DishCardProps> = ({
  menuItem,
  onRetryGeneration,
  onSaveImage,
  onShareImage,
  onImageClick
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageClick = () => {
    if (menuItem.generatedImageUrl && onImageClick) {
      onImageClick(menuItem.generatedImageUrl);
    }
  };

  return (
    <div className="dish-card">
    <div className="dish-image-container">
      {menuItem.generationStatus === 'success' && !imageError ? (
        <LazyImage
          src={menuItem.generatedImageUrl}
          alt={menuItem.name}
          className="dish-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={handleImageClick}
          quality="high"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : menuItem.generationStatus === 'failed' || imageError ? (
        <div className="image-error">
          <div className="error-icon">🍽️</div>
          <span className="error-message">
            {'Failed to load image'}
          </span>
          {onRetryGeneration && (
            <button
              className="retry-button"
              onClick={() => onRetryGeneration(menuItem.id)}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div className="image-generating">
          <div className="loading-spinner"></div>
          <span>Generating image...</span>
        </div>
      )}
    </div>

    <div className="dish-info">
      <h3 className="dish-name">{menuItem.name}</h3>
      {menuItem.description && (
        <p className="dish-description">{menuItem.description}</p>
      )}
      {menuItem.price && (
        <div className="dish-price">{menuItem.price}</div>
      )}
      {menuItem.category && (
        <div className="dish-category">{menuItem.category}</div>
      )}
      {menuItem.isManuallyEdited && (
        <div className="manual-edit-indicator">
          <span className="edit-icon">✏️</span>
          <span>Manually edited</span>
        </div>
      )}
    </div>

    {menuItem.generationStatus === 'success' && (
      <div className="dish-actions">
        {onSaveImage && (
          <button
            className="action-button save-button"
            onClick={() => onSaveImage(menuItem.id)}
            title="Save image"
          >
            💾
          </button>
        )}
        {onShareImage && (
          <button
            className="action-button share-button"
            onClick={() => onShareImage(menuItem.id)}
            title="Share image"
          >
            🔗
          </button>
        )}
      </div>
    )}
  </div>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,  
  isLoading = false,
  error,
  onRetryGeneration,
  onSaveImage,
  onShareImage,
  onRetryProcessing,
  onUploadNew,
  onDismissError
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageZoom = (imageUrl: string) => {
    setZoomedImage(imageUrl);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  if (isLoading) {
    return (
      <div className="results-loading">
        <div className="loading-spinner large"></div>
        <h2>Processing your menu...</h2>
        <p>This may take a few moments</p>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div className="results-display">
        <ErrorMessage
          error={error}
          type="error"
          onRetry={onRetryProcessing}
          onDismiss={onDismissError}
          showTroubleshooting={true}
        />
      </div>
    );
  }

  // if (!results.extractedItems || results.extractedItems.length === 0) {
  //   return (
  //     <div className="results-display">
  //       <NoResultsFallback
  //         onRetry={onRetryProcessing}
  //         onUploadNew={onUploadNew}
  //         showTroubleshooting={true}
  //       />
  //     </div>
  //   );
  // }

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Generated Dish Images</h2>
        <p>{results.length} dishes found</p>
      </div>

      <div className="dishes-grid">
        {results.map((item) => {
          const generatedImage = results.find(
            (img) => img.id === item.id
          );
          
          return (
            <DishCard
              key={item.id}
              menuItem={item}
              onRetryGeneration={onRetryGeneration}
              onSaveImage={onSaveImage}
              onShareImage={onShareImage}
              onImageClick={handleImageZoom}
            />
          );
        })}
      </div>

      {zoomedImage && (
        <div className="image-zoom-overlay" onClick={handleCloseZoom}>
          <div className="image-zoom-container">
            <img src={zoomedImage} alt="Zoomed dish" className="zoomed-image" />
            <button className="close-zoom" onClick={handleCloseZoom}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;