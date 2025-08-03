"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.post('/upload', upload_1.upload.single('menuImage'), upload_1.handleUploadError, upload_1.validateFileUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'no_file',
                message: 'No file was uploaded.'
            });
        }
        const sessionId = req.body.sessionId || (0, uuid_1.v4)();
        const imageUrl = `/uploads/${sessionId}/original/${req.file.filename}`;
        console.log(`File uploaded successfully: ${req.file.filename}, Session: ${sessionId}`);
        const response = {
            success: true,
            data: {
                sessionId,
                imageUrl
            },
            message: 'File uploaded successfully'
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Upload endpoint error:', error);
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'An unexpected error occurred during file upload.'
        });
    }
});
router.get('/upload/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    res.json({
        success: true,
        data: {
            sessionId,
            status: 'uploaded',
            message: 'File upload completed'
        }
    });
});
exports.default = router;
//# sourceMappingURL=upload.js.map