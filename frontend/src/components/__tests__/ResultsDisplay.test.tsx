import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultsDisplay from '../ResultsDisplay';
import { ProcessingResult, MenuItem, GeneratedImage } from '../../types';

// Mock data
const mockMenuItem: MenuItem = {
  id: '1',
  name: 'Grilled Salmon',
  description: 'Fresh Atlantic salmon grilled to perfection with herbs',
  price: '$24.99',
  category: 'Main Course'
};

const mockGeneratedImage: GeneratedImage = {
  url: 'https://example.com/salmon.jpg',
  menuItemId: '1',
  status: 'success'
};

const mockFailedImage: GeneratedImage = {
  url: '',
  menuItemId: '2',
  status: 'failed',
  errorMessage: 'Failed to generate image'
};

const mockResults: ProcessingResult = {
  originalImage: 'https://example.com/menu.jpg',
  extractedItems: [mockMenuItem],
  generatedImages: [mockGeneratedImage],
  processingStatus: 'completed'
};

const mockResultsWithFailedImage: ProcessingResult = {
  originalImage: 'https://example.com/menu.jpg',
  extractedItems: [
    mockMenuItem,
    {
      id: '2',
      name: 'Pasta Carbonara',
      description: 'Classic Italian pasta with eggs and pancetta',
      price: '$18.99'
    }
  ],
  generatedImages: [mockGeneratedImage, mockFailedImage],
  processingStatus: 'completed'
};

const emptyResults: ProcessingResult = {
  originalImage: 'https://example.com/menu.jpg',
  extractedItems: [],
  generatedImages: [],
  processingStatus: 'completed'
};

describe('ResultsDisplay', () => {
  const mockHandlers = {
    onRetryGeneration: jest.fn(),
    onSaveImage: jest.fn(),
    onShareImage: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading state when isLoading is true', () => {
      render(<ResultsDisplay results={mockResults} isLoading={true} />);
      
      expect(screen.getByText('Processing your menu...')).toBeTruthy();
      expect(screen.getByText('This may take a few moments')).toBeTruthy();
    });
  });

  describe('No Results State', () => {
    it('displays no results message when no items are extracted', () => {
      render(<ResultsDisplay results={emptyResults} />);
      
      expect(screen.getByText('No dishes detected')).toBeTruthy();
      expect(screen.getByText('We couldn\'t find any menu items in your image.')).toBeTruthy();
      expect(screen.getByText('Try these tips:')).toBeTruthy();
      expect(screen.getByText('Make sure the menu text is clearly visible')).toBeTruthy();
    });
  });

  describe('Results Display', () => {
    it('displays dish cards with correct information', () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      expect(screen.getByText('Generated Dish Images')).toBeTruthy();
      expect(screen.getByText('1 dishes found')).toBeTruthy();
      expect(screen.getByText('Grilled Salmon')).toBeTruthy();
      expect(screen.getByText('Fresh Atlantic salmon grilled to perfection with herbs')).toBeTruthy();
      expect(screen.getByText('$24.99')).toBeTruthy();
      expect(screen.getByText('Main Course')).toBeTruthy();
    });

    it('displays multiple dish cards', () => {
      render(<ResultsDisplay results={mockResultsWithFailedImage} {...mockHandlers} />);
      
      expect(screen.getByText('2 dishes found')).toBeTruthy();
      expect(screen.getByText('Grilled Salmon')).toBeTruthy();
      expect(screen.getByText('Pasta Carbonara')).toBeTruthy();
    });

    it('displays manually edited indicator when item is manually edited', () => {
      const manuallyEditedResults = {
        ...mockResults,
        extractedItems: [{
          ...mockMenuItem,
          isManuallyEdited: true
        }]
      };
      
      render(<ResultsDisplay results={manuallyEditedResults} />);
      
      expect(screen.getByText('Manually edited')).toBeTruthy();
    });
  });

  describe('Image Handling', () => {
    it('displays successful images', () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      expect(image).toBeTruthy();
      expect(image.getAttribute('src')).toBe('https://example.com/salmon.jpg');
    });

    it('displays error state for failed images', () => {
      render(<ResultsDisplay results={mockResultsWithFailedImage} {...mockHandlers} />);
      
      expect(screen.getByText('Failed to generate image')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('calls onRetryGeneration when retry button is clicked', () => {
      render(<ResultsDisplay results={mockResultsWithFailedImage} {...mockHandlers} />);
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockHandlers.onRetryGeneration).toHaveBeenCalledWith('2');
    });

    it('displays generating state for images without status', () => {
      const generatingResults = {
        ...mockResults,
        generatedImages: []
      };
      
      render(<ResultsDisplay results={generatingResults} />);
      
      expect(screen.getByText('Generating image...')).toBeTruthy();
    });
  });

  describe('Image Zoom Functionality', () => {
    it('opens zoom overlay when image is clicked', async () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.click(image);
      
      await waitFor(() => {
        expect(screen.getByAltText('Zoomed dish')).toBeTruthy();
      });
    });

    it('closes zoom overlay when close button is clicked', async () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.click(image);
      
      await waitFor(() => {
        const closeButton = screen.getByText('✕');
        fireEvent.click(closeButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByAltText('Zoomed dish')).toBeNull();
      });
    });

    it('closes zoom overlay when overlay background is clicked', async () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.click(image);
      
      await waitFor(() => {
        const overlay = screen.getByAltText('Zoomed dish').closest('.image-zoom-overlay');
        fireEvent.click(overlay!);
      });
      
      await waitFor(() => {
        expect(screen.queryByAltText('Zoomed dish')).toBeNull();
      });
    });
  });

  describe('Action Buttons', () => {
    it('displays save and share buttons for successful images', () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      expect(screen.getByTitle('Save image')).toBeTruthy();
      expect(screen.getByTitle('Share image')).toBeTruthy();
    });

    it('calls onSaveImage when save button is clicked', () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      const saveButton = screen.getByTitle('Save image');
      fireEvent.click(saveButton);
      
      expect(mockHandlers.onSaveImage).toHaveBeenCalledWith('1');
    });

    it('calls onShareImage when share button is clicked', () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      const shareButton = screen.getByTitle('Share image');
      fireEvent.click(shareButton);
      
      expect(mockHandlers.onShareImage).toHaveBeenCalledWith('1');
    });

    it('does not display action buttons when handlers are not provided', () => {
      render(<ResultsDisplay results={mockResults} />);
      
      expect(screen.queryByTitle('Save image')).toBeNull();
      expect(screen.queryByTitle('Share image')).toBeNull();
    });
  });

  describe('Image Loading States', () => {
    it('shows loading state while image is loading', () => {
      render(<ResultsDisplay results={mockResults} />);
      
      expect(screen.getByText('Loading image...')).toBeTruthy();
    });

    it('handles image load error', async () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeTruthy();
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });

    it('removes loading state when image loads successfully', async () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.load(image);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      render(<ResultsDisplay results={mockResults} />);
      
      expect(screen.getByAltText('Grilled Salmon')).toBeTruthy();
    });

    it('has proper button labels', () => {
      render(<ResultsDisplay results={mockResults} {...mockHandlers} />);
      
      expect(screen.getByTitle('Save image')).toBeTruthy();
      expect(screen.getByTitle('Share image')).toBeTruthy();
    });

    it('supports keyboard navigation for zoom close', async () => {
      render(<ResultsDisplay results={mockResults} />);
      
      const image = screen.getByAltText('Grilled Salmon');
      fireEvent.click(image);
      
      await waitFor(() => {
        const closeButton = screen.getByText('✕');
        expect(closeButton).toBeTruthy();
        fireEvent.keyDown(closeButton, { key: 'Enter' });
      });
    });
  });
});