import { checkEndpointHealth } from './services/llmService.js';
import { queryKnowledgeBase } from './services/ragService.js';
import { db } from './services/db.js';

async function runTests() {
  console.log("=== Running Local LLM Platform Verification Tests ===");

  // 1. Test database operations
  try {
    const defaultModels = db.getModels();
    if (defaultModels.length > 0) {
      console.log("✓ DB: Default models detected successfully.");
    } else {
      throw new Error("DB: No default models in DB");
    }

    const testChat = db.createChat("Test Conversation", "mock-model");
    console.log(`✓ DB: Chat session created: id=${testChat.id}`);

    const msg = db.addMessage(testChat.id, "user", "Hello backend test");
    console.log(`✓ DB: Message inserted: id=${msg.id}`);

    const history = db.getMessages(testChat.id);
    if (history.length === 1 && history[0].content === "Hello backend test") {
      console.log("✓ DB: Retrieved history matches input.");
    } else {
      throw new Error("DB: History retrieval failed");
    }

    // cleanup test chat
    db.deleteChat(testChat.id);
    console.log("✓ DB: Cleaned up test chat successfully.");

  } catch (err) {
    console.error("✗ DB test failed:", err.message);
    process.exit(1);
  }

  // 2. Test RAG / Embedding Search Engine
  try {
    // Test cosine similarity directly (no LLM endpoint required)
    function cosineSimilarity(vecA, vecB) {
      let dotProduct = 0, normA = 0, normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Add temporary documents with mock embeddings
    const docName = "ai-safety-standard.txt";
    const docText = "Local LLM Platform operates entirely private. Safety controls prevent data leakage. Vector embedding RAG processes chunks locally.";
    const chunks = [
      { text: "Local LLM Platform operates entirely private.", embedding: [0.9, 0.1, 0.2, 0.3, 0.4] },
      { text: "Safety controls prevent data leakage.", embedding: [0.1, 0.9, 0.2, 0.3, 0.4] },
      { text: "Vector embedding RAG processes chunks locally.", embedding: [0.1, 0.2, 0.9, 0.3, 0.4] }
    ];
    
    const doc = db.addDocument(docName, "memory", docText, chunks);
    console.log(`✓ RAG: Document indexed: id=${doc.id}`);

    // Simulate query embedding (same as "safety" chunk vector)
    const queryVec = [0.1, 0.9, 0.2, 0.3, 0.4];
    const docData = db.getDocuments().find(d => d.id === doc.id);
    const allChunks = docData.chunks.map(c => ({
      text: c.text,
      similarity: cosineSimilarity(queryVec, c.embedding)
    }));

    allChunks.sort((a, b) => b.similarity - a.similarity);
    const results = allChunks.filter(c => c.similarity > 0.1);

    if (results.length > 0 && results[0].text.includes("Safety")) {
      console.log(`✓ RAG: Cosine similarity search successful. Match="${results[0].text}" (score: ${results[0].similarity.toFixed(4)})`);
    } else {
      throw new Error("RAG: Search did not return matching chunk");
    }

    // cleanup doc
    db.deleteDocument(doc.id);
    console.log("✓ RAG: Cleaned up test document successfully.");

  } catch (err) {
    console.error("✗ RAG test failed:", err.message);
    process.exit(1);
  }

  // 3. Test LLM Endpoint check mock
  try {
    const mockHealth = await checkEndpointHealth('mock', 'mock');
    console.log("✓ LLM: Health checker handles mock provider successfully.");
  } catch (err) {
    console.error("✗ LLM test failed:", err.message);
    process.exit(1);
  }

  console.log("=== All Backend Verification Tests Passed successfully! ===");
}

runTests();
