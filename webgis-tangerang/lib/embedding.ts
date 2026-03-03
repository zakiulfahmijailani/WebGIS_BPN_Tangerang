import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);

/**
 * Generates a 384-dimensional embedding using all-MiniLM-L6-v2
 * Falls back to a zero-filled array if the API is unavailable
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text,
        });
        return response as unknown as number[];
    } catch (error) {
        console.error('[Embedding] HuggingFace error:', error);
        console.log('[Embedding] Using zero-filled fallback');
        return new Array(384).fill(0);
    }
}
