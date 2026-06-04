# Full-Stack AI Integration Guide (Gemini API)

This guide details the recommended architecture and steps to integrate Generative AI capabilities (like party suggestion, automated option generation, and menu scanning) into the **BeerVote** application.

---

## 1. Architecture Overview

For maximum security, reliability, and cost control, the integration uses a **Client-Server Architecture**:

```
[ Frontend (React) ] 
       │ 
       ▼ Request (e.g., POST /api/ai/suggest)
[ Backend (Express) ]  <─── Reads GEMINI_API_KEY securely from .env
       │ 
       ▼ SDK call (via @google/genai)
[ Google Gemini API ]
```

### Why this design?
- **Key Safety:** Keeping `GEMINI_API_KEY` on the Express backend prevents it from being exposed to the client browser.
- **Quota Protection:** Allows rate-limiting on Express backend routes to prevent quota abuse.
- **Prompt Isolation:** Allows prompt templates to be constructed server-side, preventing prompt-injection attacks.

---

## 2. Implementation Steps

### Step 1: Install Gen AI SDK
Run the following command in the project root to install Google's official AI SDK on the backend:
```bash
npm install @google/genai
```

### Step 2: Configure Environment
Ensure your [.env](file:///Users/tobbiesng/Code/beer-voter/.env) file has your API key:
```ini
GEMINI_API_KEY=your-gemini-api-key-here
```

### Step 3: Create Express Route (`server/routes/ai.ts`)
Create a route to handle assistant queries. For example, a route to extract voting options from a simple text paragraph:

```typescript
import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint to automatically extract event details from a text prompt
router.post('/suggest', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: 'Prompt is required.' });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        // Enforce structured JSON output
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Fun title of the event' },
            suggestedDateTimes: {
              type: 'array',
              items: { type: 'string' },
              description: 'ISO datetime suggestions (e.g. 2026-06-05T19:00:00)'
            },
            suggestedLocations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Suggested venue names'
            },
            suggestedBeerStyles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Suggested beers or beverages'
            }
          },
          required: ['title', 'suggestedDateTimes', 'suggestedLocations', 'suggestedBeerStyles']
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      res.json(JSON.parse(resultText));
    } else {
      res.status(500).json({ message: 'Empty response from AI' });
    }
  } catch (err) {
    console.error('AI Suggestion error:', err);
    res.status(500).json({ message: 'Failed to generate AI suggestion.' });
  }
});

export default router;
```

### Step 4: Register Route in Server (`server/index.ts`)
Mount the new AI route:
```typescript
import aiRoutes from './routes/ai.js';
// ...
app.use('/api/ai', aiRoutes);
```

### Step 5: Frontend integration in React (`src/components/CreateEvent.tsx`)
Create a text area inside your event creation modal where users can type their description. Clicking **"AI Lên Kèo Hộ"** calls the endpoint, gets structured JSON, and automatically populates the form inputs!
