const { HfInference } = require('@huggingface/inference');

// Uses the public API by default if HF_TOKEN is not in env
const hf = new HfInference(process.env.HF_TOKEN);

/**
 * Generates a 384-dimensional embedding using all-MiniLM-L6-v2
 * @param {string} text - The input text
 * @returns {Promise<number[]>} - Float array of embeddings
 */
async function generateEmbedding(text) {
    try {
        const response = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text,
        });
        return response;
    } catch (error) {
        console.error("Error generating HF embedding:", error);
        // Fallback dummy embedding if HF public API rate limits us, just so the app doesn't crash during dev
        console.log("Using zero-filled fallback embedding due to error.");
        return new Array(384).fill(0);
    }
}

module.exports = { generateEmbedding };
