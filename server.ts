import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize Gemini API client if key is available
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // API endpoint for AI travel guide / place recommendations
  app.post('/api/ai-guide', async (req, res) => {
    try {
      const { locationName, lat, lng, promptType } = req.body;
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key not configured on server.' });
      }

      let prompt = `Provide a helpful travel guide and interesting facts about coordinates ${lat}, ${lng} (${locationName || 'this location'}).`;
      if (promptType === 'food') {
        prompt = `What are the best local foods, culinary specialties, or recommended dining styles near ${locationName || `coordinates ${lat}, ${lng}`}? Give 3-4 suggestions.`;
      } else if (promptType === 'history') {
        prompt = `What is the historical significance, heritage, or interesting trivia about ${locationName || `coordinates ${lat}, ${lng}`}?`;
      } else if (promptType === 'itinerary') {
        prompt = `Suggest a 1-day walking tour itinerary starting from ${locationName || `coordinates ${lat}, ${lng}`} featuring local OpenStreetMap points of interest.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate AI response' });
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
