import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NoResultsFallback from '../NoResultsFallback';

describe('NoResultsFallback', () => {
  const mockOnRetry = jest.fn();
  const mockOnUploadNew = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main message and description', () => {
    render(<NoResultsFallback />);
    
    expect(screen.getByText('No dishes detected')).toBeTruthy();
    expect(screen.getByText(/We couldn't find any menu items in your image/)).toBeTruthy();
  });

  it('shows retry button when onRetry is provided', () => {
    render(<NoResultsFallback onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByText('Try Processing Again');
    expect(retryButton).toBeTruthy();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('shows upload new button when onUploadNew is provided', () => {
    render(<NoResultsFallback onUploadNew={mockOnUploadNew} />);
    
    const uploadButton = screen.getByText('Upload Different Image');
    expect(uploadButton).toBeTruthy();
    
    fireEvent.click(uploadButton);
    expect(mockOnUploadNew).toHaveBeenCalledTimes(1);
  });

  it('shows both buttons when both handlers are provided', () => {
    render(
      <NoResultsFallback 
        onRetry={mockOnRetry} 
        onUploadNew={mockOnUploadNew} 
      />
    );
    
    expect(screen.getByText('Try Processing Again')).toBeTruthy();
    expect(screen.getByText('Upload Different Image')).toBeTruthy();
  });

  it('shows troubleshooting tips by default', () => {
    render(<NoResultsFallback />);
    
    expect(screen.getByText('💡 Tips for better results:')).toBeTruthy();
    expect(screen.getByText('Image Quality')).toBeTruthy();
    expect(screen.getByText('Good Lighting')).toBeTruthy();
    expect(screen.getByText('Focus & Clarity')).toBeTruthy();
    expect(screen.getByText('Proper Angle')).toBeTruthy();
    expect(screen.getByText('Text Visibility')).toBeTruthy();
    expect(screen.getByText('File Size')).toBeTruthy();
  });

  it('hides troubleshooting tips when showTroubleshooting is false', () => {
    render(<NoResultsFallback showTroubleshooting={false} />);
    
    expect(screen.queryByText('💡 Tips for better results:')).toBeNull();
    expect(screen.queryByText('Image Quality')).toBeNull();
  });

  it('shows help section', () => {
    render(<NoResultsFallback />);
    
    expect(screen.getByText('Still having trouble?')).toBeTruthy();
    expect(screen.getByText(/Try uploading a different section of the menu/)).toBeTruthy();
  });

  it('displays all tip cards with correct content', () => {
    render(<NoResultsFallback />);
    
    // Check that all tip cards are present
    const tipCards = [
      { title: 'Image Quality', description: 'Use a high-resolution image with clear, readable text' },
      { title: 'Good Lighting', description: 'Ensure the menu is well-lit without shadows or glare' },
      { title: 'Focus & Clarity', description: 'Make sure the menu text is in focus and not blurry' },
      { title: 'Proper Angle', description: 'Take the photo straight-on, not at an extreme angle' },
      { title: 'Text Visibility', description: 'Ensure menu text is clearly visible and not cut off' },
      { title: 'File Size', description: 'Keep images under 10MB for optimal processing' }
    ];

    tipCards.forEach(tip => {
      expect(screen.getByText(tip.title)).toBeTruthy();
      expect(screen.getByText(tip.description)).toBeTruthy();
    });
  });

  it('renders icons correctly', () => {
    render(<NoResultsFallback />);
    
    // Check for main icons
    expect(screen.getByText('🔍')).toBeTruthy();
    expect(screen.getByText('🍽️')).toBeTruthy();
    
    // Check for tip icons
    expect(screen.getByText('📸')).toBeTruthy();
    expect(screen.getByText('💡')).toBeTruthy();
    expect(screen.getByText('🎯')).toBeTruthy();
    expect(screen.getByText('📐')).toBeTruthy();
    expect(screen.getByText('🔤')).toBeTruthy();
    expect(screen.getByText('📏')).toBeTruthy();
  });

  it('does not show action buttons when handlers are not provided', () => {
    render(<NoResultsFallback />);
    
    expect(screen.queryByText('Try Processing Again')).toBeNull();
    expect(screen.queryByText('Upload Different Image')).toBeNull();
  });
});