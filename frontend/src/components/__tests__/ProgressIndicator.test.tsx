import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressIndicator from '../ProgressIndicator';

describe('ProgressIndicator', () => {
  it('displays progress bar with correct width', () => {
    render(<ProgressIndicator progress={75} />);
    
    const progressFill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('75%');
  });

  it('displays progress percentage by default', () => {
    render(<ProgressIndicator progress={42} />);
    
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('hides progress percentage when showPercentage is false', () => {
    render(<ProgressIndicator progress={42} showPercentage={false} />);
    
    expect(screen.queryByText('42%')).toBeNull();
  });

  it('displays current stage when provided', () => {
    render(<ProgressIndicator progress={50} currentStage="Extracting text..." />);
    
    expect(screen.getByText('Extracting text...')).toBeTruthy();
  });

  it('displays estimated time remaining when provided', () => {
    render(<ProgressIndicator progress={30} estimatedTimeRemaining={45} />);
    
    expect(screen.getByText('~45s remaining')).toBeTruthy();
  });

  it('formats time correctly for minutes and seconds', () => {
    render(<ProgressIndicator progress={20} estimatedTimeRemaining={125} />);
    
    expect(screen.getByText('~2m 5s remaining')).toBeTruthy();
  });

  it('formats time correctly for exact minutes', () => {
    render(<ProgressIndicator progress={10} estimatedTimeRemaining={120} />);
    
    expect(screen.getByText('~2m 0s remaining')).toBeTruthy();
  });

  it('handles progress values outside 0-100 range', () => {
    const { rerender } = render(<ProgressIndicator progress={-10} />);
    
    let progressFill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('0%');
    
    rerender(<ProgressIndicator progress={150} />);
    progressFill = document.querySelector('.progress-bar-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('100%');
  });

  it('displays all information when all props are provided', () => {
    render(
      <ProgressIndicator
        progress={65}
        currentStage="Generating images..."
        estimatedTimeRemaining={30}
        showPercentage={true}
      />
    );
    
    expect(screen.getByText('65%')).toBeTruthy();
    expect(screen.getByText('Generating images...')).toBeTruthy();
    expect(screen.getByText('~30s remaining')).toBeTruthy();
  });

  it('does not display time remaining when value is 0 or negative', () => {
    const { rerender } = render(<ProgressIndicator progress={50} estimatedTimeRemaining={0} />);
    
    expect(screen.queryByText(/remaining/)).toBeNull();
    
    rerender(<ProgressIndicator progress={50} estimatedTimeRemaining={-5} />);
    expect(screen.queryByText(/remaining/)).toBeNull();
  });

  it('rounds progress percentage to nearest integer', () => {
    render(<ProgressIndicator progress={33.7} />);
    
    expect(screen.getByText('34%')).toBeTruthy();
  });

  it('rounds time remaining to nearest second', () => {
    render(<ProgressIndicator progress={50} estimatedTimeRemaining={45.8} />);
    
    expect(screen.getByText('~46s remaining')).toBeTruthy();
  });
});