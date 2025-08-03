import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyImage from '../LazyImage';

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

const mockIntersectionObserver = jest.fn(() => ({
  observe: mockObserve,
  unobserve: mockUnobserve,
  disconnect: mockDisconnect,
}));

window.IntersectionObserver = mockIntersectionObserver;

// Mock Image constructor for testing image loading
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
};

global.Image = jest.fn(() => mockImage) as any;

describe('LazyImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    mockDisconnect.mockClear();
    mockImage.onload = null;
    mockImage.onerror = null;
    mockImage.src = '';
  });

  it('renders without crashing', () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('sets up intersection observer on mount', () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        rootMargin: '50px',
        threshold: 0.1
      })
    );
  });

  it('shows loading placeholder when image is in view but not loaded', async () => {
    const { container } = render(<LazyImage src="test-image.jpg" alt="Test image" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(container.querySelector('.default-placeholder')).toBeInTheDocument();
    });
  });

  it('loads image when in view', async () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByAltText('Test image')).toBeInTheDocument();
    });
  });

  it('handles image load success', async () => {
    const onLoad = jest.fn();
    render(<LazyImage src="test-image.jpg" alt="Test image" onLoad={onLoad} />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    fireEvent.load(img);

    expect(onLoad).toHaveBeenCalled();
  });

  it('handles image load error', async () => {
    const onError = jest.fn();
    render(<LazyImage src="test-image.jpg" alt="Test image" onError={onError} />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
    expect(onError).toHaveBeenCalled();
  });

  it('handles click events', async () => {
    const onClick = jest.fn();
    render(<LazyImage src="test-image.jpg" alt="Test image" onClick={onClick} />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    fireEvent.click(img);

    expect(onClick).toHaveBeenCalled();
  });

  it('uses custom placeholder when provided', async () => {
    render(
      <LazyImage 
        src="test-image.jpg" 
        alt="Test image" 
        placeholder="placeholder.jpg"
      />
    );
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      const placeholderImg = screen.getByAltText('');
      expect(placeholderImg).toHaveAttribute('src', 'placeholder.jpg');
    });
  });

  it('applies correct CSS classes during loading states', async () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    expect(img).toHaveClass('loading');

    fireEvent.load(img);
    await waitFor(() => {
      expect(img).toHaveClass('loaded');
    });
  });

  it('generates quality-specific URLs', async () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" quality="low" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    expect(img.src).toContain('quality=low');
  });

  it('implements progressive loading for high quality images', async () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" quality="high" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      // Should create a new Image object for preloading
      expect(global.Image).toHaveBeenCalled();
    });
  });

  it('disconnects observer when component unmounts', () => {
    const { unmount } = render(<LazyImage src="test-image.jpg" alt="Test image" />);
    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});

// Performance tests
describe('LazyImage Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performance.mark = jest.fn();
    performance.measure = jest.fn();
  });

  it('measures image loading performance', async () => {
    const startTime = performance.now();
    
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    
    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    const img = await screen.findByAltText('Test image');
    fireEvent.load(img);

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    // Image should load quickly (within reasonable time for tests)
    expect(loadTime).toBeLessThan(100);
  });

  it('does not load images that are not in view', () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    
    // Don't trigger intersection observer
    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument();
  });

  it('only creates one intersection observer per component', () => {
    render(<LazyImage src="test-image.jpg" alt="Test image" />);
    expect(mockIntersectionObserver).toHaveBeenCalledTimes(1);
  });
});