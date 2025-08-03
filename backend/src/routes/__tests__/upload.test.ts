import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import uploadRoutes from '../upload';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', uploadRoutes);

// Test file paths
const testFilesDir = path.join(__dirname, 'test-files');
const validImagePath = path.join(testFilesDir, 'test-image.jpg');
const invalidImagePath = path.join(testFilesDir, 'test-file.txt');

// Create test files directory and files
beforeAll(() => {
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }
  
  // Create a small valid JPEG file (minimal JPEG header)
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
  ]);
  fs.writeFileSync(validImagePath, jpegHeader);
  
  // Create an invalid text file
  fs.writeFileSync(invalidImagePath, 'This is not an image file');
});

// Clean up test files
afterAll(() => {
  if (fs.existsSync(testFilesDir)) {
    fs.rmSync(testFilesDir, { recursive: true, force: true });
  }
  
  // Clean up any uploads created during tests
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }
});

describe('Upload API Endpoints', () => {
  describe('POST /api/upload', () => {
    it('should successfully upload a valid image file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('menuImage', validImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('imageUrl');
      expect(response.body.message).toBe('File uploaded successfully');
      
      // Verify session ID is a valid UUID format
      expect(response.body.data.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      
      // Verify image URL format
      expect(response.body.data.imageUrl).toMatch(
        /^\/uploads\/[0-9a-f-]+\/original\/menu-image-\d+\.jpg$/
      );
    });

    it('should accept custom session ID', async () => {
      const customSessionId = 'custom-session-123';
      
      const response = await request(app)
        .post('/api/upload')
        .field('sessionId', customSessionId)
        .attach('menuImage', validImagePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe(customSessionId);
    });

    it('should reject upload with no file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('no_file');
      expect(response.body.message).toContain('No file was uploaded');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('menuImage', invalidImagePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('invalid_format');
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      // Create a large file (11MB)
      const largeFilePath = path.join(testFilesDir, 'large-file.jpg');
      const largeFileSize = 11 * 1024 * 1024; // 11MB
      const largeBuffer = Buffer.alloc(largeFileSize, 0xFF);
      
      // Add JPEG header to make it a valid image format
      largeBuffer[0] = 0xFF;
      largeBuffer[1] = 0xD8;
      largeBuffer[largeFileSize - 2] = 0xFF;
      largeBuffer[largeFileSize - 1] = 0xD9;
      
      fs.writeFileSync(largeFilePath, largeBuffer);

      const response = await request(app)
        .post('/api/upload')
        .attach('menuImage', largeFilePath)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('file_too_large');
      expect(response.body.message).toContain('File size too large');

      // Clean up large file
      fs.unlinkSync(largeFilePath);
    });

    it('should handle multiple files error', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('menuImage', validImagePath)
        .attach('extraFile', validImagePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('too_many_files');
    });

    it('should handle wrong field name', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('wrongFieldName', validImagePath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('unexpected_field');
    });
  });

  describe('GET /api/upload/:sessionId/status', () => {
    it('should return upload status for valid session ID', async () => {
      const sessionId = 'test-session-123';
      
      const response = await request(app)
        .get(`/api/upload/${sessionId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBe(sessionId);
      expect(response.body.data.status).toBe('uploaded');
      expect(response.body.data.message).toBe('File upload completed');
    });
  });
});

describe('File Upload Integration', () => {
  it('should create proper directory structure', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('menuImage', validImagePath)
      .expect(200);

    const sessionId = response.body.data.sessionId;
    const expectedDir = path.join(process.cwd(), 'uploads', sessionId, 'original');
    
    expect(fs.existsSync(expectedDir)).toBe(true);
    
    // Check if file was actually saved
    const files = fs.readdirSync(expectedDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^menu-image-\d+\.jpg$/);
  });

  it('should preserve file extension', async () => {
    // Create a PNG test file
    const pngPath = path.join(testFilesDir, 'test.png');
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE
    ]);
    fs.writeFileSync(pngPath, pngHeader);

    const response = await request(app)
      .post('/api/upload')
      .attach('menuImage', pngPath)
      .expect(200);

    expect(response.body.data.imageUrl).toMatch(/\.png$/);
    
    // Clean up
    fs.unlinkSync(pngPath);
  });
});