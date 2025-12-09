import { GoogleGenAI, Type } from "@google/genai";
import { GeminiWordResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Text Generation ---

export const generateWordDetails = async (word: string): Promise<GeminiWordResponse> => {
  if (!apiKey) throw new Error("API Key is missing");

  const prompt = `
    You are a professional French language teacher.
    I will give you a French word or phrase: "${word}".
    Please provide the following in JSON format:
    1. "translation": The Chinese translation.
    2. "definition": A brief definition in French (simple and clear).
    3. "exampleSentence": An example sentence in French using this word.
    4. "exampleTranslation": The Chinese translation of that example sentence.
    5. "phonetic": The IPA phonetic transcription.
    6. "gender": The grammatical gender of the word if applicable. Return exactly one of: "Masculin", "Féminin", "Pluriel", or "Neutre" (for phrases/verbs).
    7. "nuance": A "Vibe Check" or cultural context note. Explain when to use this word, its tone (formal/slang), or a fun fact. Keep it brief and interesting. (In English or Chinese).
    8. "texture": The visual material texture that best matches this word's meaning. Choose exactly ONE from: 
       - "fur" (for animals, pets, soft things)
       - "wood" (for trees, furniture, solid objects)
       - "water" (for liquids, ocean, drinks, flow)
       - "plant" (for flowers, vegetables, nature)
       - "fabric" (for clothes, curtains, soft materials)
       - "metal" (for tools, technology, cars, hard objects)
       - "stone" (default/generic/abstract concepts)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translation: { type: Type.STRING },
          definition: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          exampleTranslation: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          gender: { type: Type.STRING },
          nuance: { type: Type.STRING },
          texture: { type: Type.STRING },
        },
        required: ["translation", "definition", "exampleSentence", "exampleTranslation", "phonetic", "gender", "nuance", "texture"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return JSON.parse(text) as GeminiWordResponse;
};

// --- Audio Generation (Native Web Speech API) ---

export const playPronunciation = async (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Web Speech API not supported");
      resolve();
      return;
    }

    const speak = () => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR'; 
      utterance.rate = 0.9; // Slightly slower for better clarity

      // improved voice selection
      const voices = window.speechSynthesis.getVoices();
      // Try to find a premium/Google French voice, fallback to any French, then let browser default for the lang
      const voice = voices.find(v => v.lang === 'fr-FR' && (v.name.includes('Google') || v.name.includes('Premium'))) 
                 || voices.find(v => v.lang.startsWith('fr'));
      
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        // Log but don't reject to keep UI smooth. 
        // 'interrupted' is common if user clicks fast, 'not-allowed' if no interaction.
        if (e.error !== 'interrupted') {
             console.warn("Speech warning:", e.error);
        }
        resolve(); 
      };

      window.speechSynthesis.speak(utterance);
    };

    // Chrome/Safari voice loading quirk
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speak();
      };
    } else {
      speak();
    }
  });
};