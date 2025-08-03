import { ProcessingStatus } from '../types';
export interface SessionModel {
    id: string;
    originalImageUrl: string;
    status: ProcessingStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SessionRepository {
    private sessions;
    private statusIndex;
    private createdAtIndex;
    create(sessionData: Omit<SessionModel, 'createdAt' | 'updatedAt'>): Promise<SessionModel>;
    findById(id: string): Promise<SessionModel | null>;
    updateStatus(id: string, status: ProcessingStatus): Promise<SessionModel | null>;
    delete(id: string): Promise<boolean>;
    findByStatus(status: ProcessingStatus): Promise<SessionModel[]>;
    findByDateRange(startDate: Date, endDate?: Date): Promise<SessionModel[]>;
    cleanup(): Promise<number>;
    private updateIndexes;
    private removeFromIndexes;
    private addToStatusIndex;
    private removeFromStatusIndex;
}
//# sourceMappingURL=Session.d.ts.map