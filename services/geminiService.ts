import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BillData } from "../types";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const billSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    billName: {
      type: Type.STRING,
      description: "The name of the company or entity issuing the bill (e.g., 'Sri Lanka Telecom PLC', 'Comcast', 'City Water Service').",
    },
    dateOfPeriod: {
      type: Type.STRING,
      description: "The billing month and year for the charges. IMPORTANT: Format this strictly as 'Month Year' (e.g., 'October 2023'). If a date range is provided (e.g., 'Oct 1 - Oct 31' or '01/10/23-31/10/23'), convert it to 'October 2023'. If it spans two months, use the month where the majority of days fall.",
    },
    dueDate: {
      type: Type.STRING,
      description: "The specific date the payment is due (e.g., 'Nov 15, 2023'). Return null or empty string if not found.",
    },
    amount: {
      type: Type.NUMBER,
      description: "The total current charges for this specific billing period. Exclude 'Previous Balance' or 'Total Payable' if it includes arrears. Look for 'Current Charges' or 'Total for this period'.",
    },
    currency: {
      type: Type.STRING,
      description: "The currency symbol or code (e.g., '$', 'Rs.', 'LKR', 'USD'). Defaults to '$' if unsure.",
    },
    summary: {
      type: Type.STRING,
      description: "A very brief, one-sentence summary of what this bill is for (e.g., 'Monthly internet and voice charges').",
    },
  },
  required: ["billName", "amount", "currency", "dateOfPeriod"],
};

export const extractBillData = async (
  base64Data: string,
  mimeType: string
): Promise<BillData> => {
  try {
    const modelId = "gemini-3-flash-preview"; 

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this document. It is likely a utility or service bill (e.g. Sri Lanka Telecom). Extract the biller name, the billing period (formatted strictly as 'Month Year'), the due date, and the 'Current Charges'. Ignore past due amounts. Format output as JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: billSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No data returned from Gemini.");
    }

    const data = JSON.parse(text) as BillData;
    return data;
  } catch (error) {
    console.error("Error extracting bill data:", error);
    throw error;
  }
};