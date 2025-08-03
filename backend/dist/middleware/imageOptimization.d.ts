import { Request, Response, NextFunction } from 'express';
interface OptimizedImageRequest extends Request {
    query: {
        quality?: 'low' | 'medium' | 'high';
        format?: 'jpeg' | 'png' | 'webp';
        width?: string;
        height?: string;
    };
}
export declare const imageOptimizationMiddleware: (req: OptimizedImageRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export default imageOptimizationMiddleware;
//# sourceMappingURL=imageOptimization.d.ts.map