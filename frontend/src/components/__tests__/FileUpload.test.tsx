import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';
import { FileUploadState } from '../../types';

// Mock file creation helper
const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload Component', () => {
  const mockOnFileSelect = jest.fn();
  
  const defaultUploadState: FileUploadState = {
    file: null,
    preview: null,
    isUploading: false,
    uploadProgress: 0,
    error: null
  };

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('renders upload prompt when no file is selected', () => {
    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    expect(screen.getByText('Upload Menu Image')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your menu image here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: JPEG, PNG, WEBP')).toBeInTheDocument();
    expect(screen.getByText('Maximum size: 10MB')).toBeInTheDocument();
  });

  it('handles file selection through click', async () => {
    const user = userEvent.setup();
    const validFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });
    await user.click(uploadArea);

    // Simulate file input change
    const fileInput = screen.getByRole('button').querySelector('input[type=\"file\"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });

  it('handles drag and drop functionality', async () => {
    const validFile = createMockFile('test.png', 'image/png', 2 * 1024 * 1024); // 2MB

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });

    // Simulate drag over
    fireEvent.dragOver(uploadArea, {
      dataTransfer: {
        files: [validFile]
      }
    });

    // Simulate drop
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [validFile]
      }
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });

  it('shows file information when file is selected', () => {
    const selectedFile = createMockFile('menu.jpg', 'image/jpeg', 3 * 1024 * 1024); // 3MB
    const uploadStateWithFile: FileUploadState = {
      ...defaultUploadState,
      file: selectedFile,
      preview: 'data:image/jpeg;base64,mock-preview'
    };

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={uploadStateWithFile} 
      />
    );

    expect(screen.getByText('menu.jpg')).toBeInTheDocument();
    expect(screen.getByText('3 MB')).toBeInTheDocument();
    expect(screen.getByText('Click to select a different image')).toBeInTheDocument();
    expect(screen.getByAltText('Menu preview')).toBeInTheDocument();
  });

  it('shows upload progress when uploading', () => {
    const uploadingState: FileUploadState = {
      ...defaultUploadState,
      isUploading: true,
      uploadProgress: 45
    };

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={uploadingState} 
      />
    );

    expect(screen.getByText('Uploading your menu image...')).toBeInTheDocument();
    
    const progressBar = document.querySelector('.progress-fill') as HTMLElement;
    expect(progressBar).toHaveStyle('width: 45%');
  });

  it('displays error messages', () => {
    const errorState: FileUploadState = {
      ...defaultUploadState,
      error: 'File size too large. Maximum allowed size is 10MB.'
    };

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={errorState} 
      />
    );

    expect(screen.getByText('File size too large. Maximum allowed size is 10MB.')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState}
        disabled={true}
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });
    expect(uploadArea).toHaveClass('disabled');

    await user.click(uploadArea);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('disables interaction when uploading', async () => {
    const user = userEvent.setup();
    const uploadingState: FileUploadState = {
      ...defaultUploadState,
      isUploading: true
    };

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={uploadingState}
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });
    expect(uploadArea).toHaveClass('uploading');

    await user.click(uploadArea);
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });
    
    // Focus the upload area
    uploadArea.focus();
    expect(uploadArea).toHaveFocus();

    // Test Enter key
    await user.keyboard('{Enter}');
    // File input should be triggered (we can't easily test this without mocking)

    // Test Space key
    await user.keyboard(' ');
    // File input should be triggered (we can't easily test this without mocking)
  });

  it('validates file format', () => {
    const invalidFile = createMockFile('test.gif', 'image/gif', 1024);

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });

    // Simulate drop with invalid file
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [invalidFile]
      }
    });

    // onFileSelect should not be called for invalid files
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('validates file size', () => {
    const oversizedFile = createMockFile('huge.jpg', 'image/jpeg', 15 * 1024 * 1024); // 15MB

    render(
      <FileUpload 
        onFileSelect={mockOnFileSelect} 
        uploadState={defaultUploadState} 
      />
    );

    const uploadArea = screen.getByRole('button', { name: 'Upload menu image' });

    // Simulate drop with oversized file
    fireEvent.drop(uploadArea, {
      dataTransfer: {
        files: [oversizedFile]
      }
    });

    // onFileSelect should not be called for oversized files
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('formats file sizes correctly', () => {
    const testCases = [
      { file: createMockFile('small.jpg', 'image/jpeg', 500), expected: '500 Bytes' },
      { file: createMockFile('medium.jpg', 'image/jpeg', 1536), expected: '1.5 KB' },
      { file: createMockFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024), expected: '5 MB' }
    ];

    testCases.forEach(({ file, expected }) => {
      const uploadStateWithFile: FileUploadState = {
        ...defaultUploadState,
        file
      };

      const { rerender } = render(
        <FileUpload 
          onFileSelect={mockOnFileSelect} 
          uploadState={uploadStateWithFile} 
        />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();

      rerender(<div />); // Clear for next test
    });
  });
});