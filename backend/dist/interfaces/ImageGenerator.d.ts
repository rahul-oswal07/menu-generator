import { MenuItem, GeneratedImage } from '../types';
export interface ImageGenerator {
    generateDishImage(menuItem: MenuItem): Promise<GeneratedImage>;
    batchGenerate(items: MenuItem[]): Promise<GeneratedImage[]>;
}
//# sourceMappingURL=ImageGenerator.d.ts.map