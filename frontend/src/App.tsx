import { useCallback, useEffect, useState } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorMessage from './components/ErrorMessage';
import { FileUpload } from './components/FileUpload';
import ProgressIndicator from './components/ProgressIndicator';
import ResultsDisplay from './components/ResultsDisplay';
import {
  ApiResponse,
  AppState,
  FileUploadState,
  ProcessingStatusResponse,
  ResultsResponse,
  UploadResponse
} from './types';
import { reportError } from './utils/errorHandler';

const INITIAL_UPLOAD_STATE: FileUploadState = {
  file: null,
  preview: null,
  isUploading: false,
  uploadProgress: 0,
  error: null
};

const INITIAL_APP_STATE: AppState = {
  sessionId: null,
  uploadState: INITIAL_UPLOAD_STATE,
  processingState: null,
  results: null,
  error: null
};

function App() {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);

  // Generate session ID on mount
  useEffect(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setAppState(prev => ({ ...prev, sessionId }));
  }, []);

  // File upload handler
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setAppState(prev => ({
        ...prev,
        uploadState: {
          ...prev.uploadState,
          error: 'Please upload a JPEG, PNG, or WEBP image file.'
        }
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAppState(prev => ({
        ...prev,
        uploadState: {
          ...prev.uploadState,
          error: `File size too large. Maximum allowed size is 10MB. Your file is ${fileSizeMB}MB.`
        }
      }));
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);

    // Update state with selected file
    setAppState(prev => ({
      ...prev,
      uploadState: {
        file,
        preview,
        isUploading: true,
        uploadProgress: 0,
        error: null
      },
      error: null,
      results: null,
      processingState: null
    }));

    try {
      // Upload file
      const formData = new FormData();
      formData.append('menuImage', file);
      formData.append('sessionId', appState.sessionId || '');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult: ApiResponse<UploadResponse> = await uploadResponse.json();

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Update upload state
      setAppState(prev => ({
        ...prev,
        sessionId: uploadResult.data!.sessionId,
        uploadState: {
          ...prev.uploadState,
          isUploading: false,
          uploadProgress: 100
        }
      }));

      // Start processing
      await startProcessing(uploadResult.data.sessionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      reportError(error instanceof Error ? error : new Error(errorMessage), {
        component: 'App',
        action: 'file_upload'
      });

      setAppState(prev => ({
        ...prev,
        uploadState: {
          ...prev.uploadState,
          isUploading: false,
          error: errorMessage
        }
      }));
    }
  }, [appState.sessionId]);

  // Start processing
  const startProcessing = useCallback(async (sessionId: string) => {
    try {
      // Start processing
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!processResponse.ok) {
        throw new Error(`Processing failed: ${processResponse.statusText}`);
      }

      // Poll for status updates
      pollProcessingStatus(sessionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      reportError(error instanceof Error ? error : new Error(errorMessage), {
        component: 'App',
        action: 'start_processing'
      });

      setAppState(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, []);


  // Get results (moved above pollProcessingStatus)
  const getResults = useCallback(async (sessionId: string) => {
    try {
      const resultsResponse = await fetch(`/api/results/${sessionId}`);
      if (!resultsResponse.ok) {
        throw new Error(`Results fetch failed: ${resultsResponse.statusText}`);
      }
      const resultsResult: ApiResponse<ResultsResponse> = await resultsResponse.json();
      if (!resultsResult.success || !resultsResult.data) {
        throw new Error(resultsResult.error || 'Results fetch failed');
      }
      setAppState(prev => ({
        ...prev,
        results: resultsResult.data!.results,
        processingState: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get results';
      reportError(error instanceof Error ? error : new Error(errorMessage), {
        component: 'App',
        action: 'get_results'
      });
      setAppState(prev => ({
        ...prev,
        error: errorMessage,
        processingState: null
      }));
    }
  }, []);

  // Poll processing status (refactored to use recursive setTimeout)
  const pollProcessingStatus = useCallback((sessionId: string) => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const statusResponse = await fetch(`/api/status/${sessionId}`);
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }
        const statusResult: ApiResponse<ProcessingStatusResponse> = await statusResponse.json();
        if (!statusResult.success || !statusResult.data) {
          throw new Error(statusResult.error || 'Status check failed');
        }
        const status = statusResult.data;
        setAppState(prev => ({
          ...prev,
          processingState: status
        }));
        if (status.status === 'completed') {
          await getResults(sessionId);
          return;
        } else if (status.status === 'failed') {
          throw new Error('Processing failed');
        }
        // Continue polling if not cancelled
        if (!isCancelled) {
          timeoutId = setTimeout(poll, 2000);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Status check failed';
        reportError(error instanceof Error ? error : new Error(errorMessage), {
          component: 'App',
          action: 'poll_status'
        });
        setAppState(prev => ({
          ...prev,
          error: errorMessage,
          processingState: null
        }));
      }
    };

    poll();

    // Cleanup after 5 minutes
    const cleanupTimeout = setTimeout(() => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    }, 300000);

    // Return a cleanup function in case needed in the future
    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(cleanupTimeout);
    };
  }, [getResults]);

  // Retry processing
  const handleRetryProcessing = useCallback(() => {
    if (appState.sessionId) {
      setAppState(prev => ({
        ...prev,
        error: null,
        processingState: null,
        results: null
      }));
      startProcessing(appState.sessionId);
    }
  }, [appState.sessionId, startProcessing]);

  // Upload new file
  const handleUploadNew = useCallback(() => {
    // Clean up preview URL
    if (appState.uploadState.preview) {
      URL.revokeObjectURL(appState.uploadState.preview);
    }

    setAppState(INITIAL_APP_STATE);
  }, [appState.uploadState.preview]);

  // Retry image generation for specific item
  const handleRetryGeneration = useCallback(async (itemId: string) => {
    if (!appState.sessionId) return;

    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: appState.sessionId,
          itemId
        })
      });

      if (!response.ok) {
        throw new Error(`Regeneration failed: ${response.statusText}`);
      }

      // Refresh results
      await getResults(appState.sessionId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Regeneration failed';
      reportError(error instanceof Error ? error : new Error(errorMessage), {
        component: 'App',
        action: 'retry_generation',
        additionalData: { itemId }
      });

      setAppState(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [appState.sessionId, getResults]);

  // Save image
  const handleSaveImage = useCallback(async (itemId: string) => {
    if (!appState.results) return;

    const generatedImage = appState.results.find(img => img.id === itemId);
    if (!generatedImage || generatedImage.generationStatus !== 'success') return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = generatedImage.generatedImageUrl?.toString() || '';
      link.download = `dish-${itemId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      reportError(error instanceof Error ? error : new Error('Save failed'), {
        component: 'App',
        action: 'save_image',
        additionalData: { itemId }
      });
    }
  }, [appState.results]);

  // Share image
  const handleShareImage = useCallback(async (itemId: string) => {
    if (!appState.results) return;

    const generatedImage = appState.results.find(img => img.id === itemId);
    if (!generatedImage || generatedImage.generationStatus !== 'success') return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Generated Dish Image',
          url: generatedImage.generatedImageUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(generatedImage.generatedImageUrl?.toString() || '');
        // You could show a toast notification here
      }

    } catch (error) {
      reportError(error instanceof Error ? error : new Error('Share failed'), {
        component: 'App',
        action: 'share_image',
        additionalData: { itemId }
      });
    }
  }, [appState.results]);

  // Dismiss error
  const handleDismissError = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      error: null,
      uploadState: {
        ...prev.uploadState,
        error: null
      }
    }));
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (appState.uploadState.preview) {
        URL.revokeObjectURL(appState.uploadState.preview);
      }
    };
  }, [appState.uploadState.preview]);

  const isProcessing = appState.processingState?.status === 'processing' ||
    appState.processingState?.status === 'uploading';

  return (
    <ErrorBoundary>
      <div className="App">
        <header className="App-header">
          <h1>AI Menu Generator</h1>
          <p>Transform menu images into visual dish representations</p>
        </header>

        <main className="App-main">
          {/* Show upload component if no results or user wants to upload new */}
          {!appState.results && !isProcessing && (
            <section className="upload-section">
              <FileUpload
                onFileSelect={handleFileSelect}
                uploadState={appState.uploadState}
                disabled={appState.uploadState.isUploading}
              />
            </section>
          )}

          {/* Show processing indicator */}
          {isProcessing && appState.processingState && (
            <section className="processing-section">
              <div className="processing-container">
                <h2>Processing Your Menu</h2>
                <ProgressIndicator
                  progress={appState.processingState.progress}
                  currentStage={appState.processingState.currentStage}
                  estimatedTimeRemaining={appState.processingState.estimatedTimeRemaining}
                />
                <p className="processing-description">
                  We're analyzing your menu and generating beautiful dish images. This may take a few moments.
                </p>
              </div>
            </section>
          )}


          {/* Show results */}
          {appState.results && (
            <section className="results-section">
              <ResultsDisplay
                results={appState.results}
                error={appState.error}
                onRetryGeneration={handleRetryGeneration}
                onSaveImage={handleSaveImage}
                onShareImage={handleShareImage}
                onRetryProcessing={handleRetryProcessing}
                onUploadNew={handleUploadNew}
                onDismissError={handleDismissError}
              />

              {/* Upload new button */}
              <div className="upload-new-container">
                <button
                  className="upload-new-button"
                  onClick={handleUploadNew}
                >
                  Upload New Menu
                </button>
              </div>
            </section>
          )}

          {/* Show global error */}
          {appState.error && !appState.results && (
            <section className="error-section">
              <ErrorMessage
                error={appState.error}
                type="error"
                onRetry={handleRetryProcessing}
                onDismiss={handleDismissError}
                showTroubleshooting={true}
              />
            </section>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;