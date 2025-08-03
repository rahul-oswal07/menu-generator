import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
export declare const upload: multer.Multer;
export declare const validateFileUpload: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const handleUploadError: (error: any, _req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=upload.d.ts.map