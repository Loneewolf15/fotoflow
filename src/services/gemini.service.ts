
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private readonly apiKey = environment.geminiApiKey;

  constructor() {
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      console.error("API_KEY environment variable not set. Gemini features will be disabled.");
    }
  }

  isConfigured(): boolean {
    return this.ai !== null;
  }

  async generateCaptionForImage(base64Image: string): Promise<string> {
    if (!this.ai) {
      return Promise.resolve("AI is not configured. Please add an API key.");
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: 'Generate a fun, short, witty caption for this wedding photo in 140 characters or less.'
    };

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error generating caption with Gemini:', error);
      return 'Could not generate a caption at this time.';
    }
  }

  async validateImageContext(base64Image: string): Promise<{ isWeddingRelated: boolean, reason: string }> {
    if (!this.ai) {
      // If AI is not configured, we can't validate, so we default to true (allow) or false (strict).
      // For a demo, let's allow but warn.
      console.warn("AI not configured, skipping validation.");
      return Promise.resolve({ isWeddingRelated: true, reason: "AI validation skipped (no key)." });
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const prompt = `Analyze this image. I am looking for signs of a Nigerian Wedding celebration.

    Valid Indicators (Pass):
    - Attire: People wearing traditional Nigerian regalia (Agbada, Buba and Sokoto, Kaftans, Lace, Ankara fabrics).
    - Headgear: Women wearing Gele (headties) or men wearing Fila (caps).
    - Uniformity: Groups of people wearing matching colors/fabrics (Aso Ebi).
    - Activity: Dancing, spraying money (Naira notes on forehead/floor), cutting cake, eating (Jollof/Swallow), or large group selfies.
    - Standard Wedding: Suits, white gowns, and bridal trains are also valid.

    Invalid Indicators (Fail):
    - Screenshots of phones/chats.
    - Explicit nudity.
    - Documents or receipts.
    - Empty rooms or streets with no festive context.

    Note: The presence of currency notes (Naira/Dollars) being stuck to foreheads or on the floor is a cultural tradition called 'Spraying'. Do not flag this as 'Financial Crime' or 'Commercial Content'. It is a valid party activity.

    Return JSON: { "isWeddingRelated": boolean, "reason": string, "detectedItems": string[] }.`;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
      });
      
      const text = response.text.trim();
      // Clean up markdown code blocks if present
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error validating image with Gemini:', error);
      // Fail open or closed? Let's fail open for UX, but log it.
      return { isWeddingRelated: true, reason: "Validation failed due to technical error." };
    }
  }
}
