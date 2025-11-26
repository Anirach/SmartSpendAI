import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "../types";

// Ensure API Key is available
const apiKey = 'AIzaSyCX2dTtIxJAu9cGcyDia-Zsfl1lhdS4qGs';
const ai = new GoogleGenAI({ apiKey });

// Helper to check for rate limit errors
export const isRateLimitError = (error: any): boolean => {
  if (!error) return false;
  const errString = error.toString();
  return (
    error.status === 429 || 
    errString.includes('429') || 
    errString.includes('RESOURCE_EXHAUSTED') ||
    errString.includes('quota')
  );
};

// Categorize a single transaction or a batch (using batch for efficiency is better, but here's a helper)
export const categorizeTransactions = async (transactions: Partial<Transaction>[]): Promise<{ id: string, category: string, isAnomaly: boolean }[]> => {
  const model = "gemini-2.5-flash"; // Fast model for categorization

  const prompt = `
    You are a financial assistant. I will provide a list of transaction descriptions and amounts.
    For each transaction, assign the most appropriate category from this list: 
    ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Income', 'Uncategorized'].
    
    Also, flag "isAnomaly" as true if the amount seems unusually high for that category context (e.g. > $200 for coffee/fast food, > $5000 for shopping) or strictly if the description looks like a scam/error.
    
    Input Transactions:
    ${JSON.stringify(transactions.map(t => ({ id: t.id, description: t.description, amount: t.amount, type: t.type })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              isAnomaly: { type: Type.BOOLEAN }
            },
            required: ["id", "category", "isAnomaly"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText);
  } catch (error: any) {
    console.error("Failed to categorize transactions:", error);
    if (isRateLimitError(error)) {
        throw new Error("RATE_LIMIT");
    }
    return [];
  }
};

// Generate an insight summary for the dashboard
export const getSpendingInsights = async (transactions: Transaction[]): Promise<string> => {
  const model = "gemini-2.5-flash"; // Fast analysis
  
  // Summarize data to send to avoid token limits if list is huge
  const summary = transactions.slice(0, 50).map(t => `${t.date}: ${t.description} ($${t.amount}) - ${t.category}`).join('\n');

  const prompt = `
    Analyze these recent financial transactions and provide a short, bulleted list (max 3 points) of key insights. 
    Focus on spending trends, potential savings, or unusual activity.
    Keep it friendly and concise.
    
    Data:
    ${summary}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "No insights available at this time.";
  } catch (error: any) {
    console.error("Failed to get insights:", error);
    
    // Check for rate limit error (429)
    if (isRateLimitError(error)) {
       throw new Error("RATE_LIMIT");
    }
    
    return "Could not generate insights at this time. Please try again later.";
  }
};

// Chat interface using the more powerful model
export const createChatSession = () => {
  // Using gemini-3-pro-preview for complex reasoning/chat as requested
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "You are a helpful, smart personal finance assistant named 'Gemini FinBot'. You help users understand their spending, budgeting, and financial habits. You are NOT a financial advisor and should always disclaim that for investment advice. Be concise, professional, yet encouraging.",
    }
  });
};