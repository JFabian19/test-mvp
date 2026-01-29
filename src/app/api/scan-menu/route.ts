import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
        }

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64Image}`;

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective and capable vision model
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text", text: `You are an expert Menu Digitizer. Your goal is to extract EVERY food item from this restaurant menu image into a structured JSON.

                            CRITICAL INSTRUCTIONS:
                            1. **Read carefully**: Look at the entire image. Menus often have multiple columns or sections. Identify them all.
                            2. **Extract Items**: For each dish/drink, extract:
                               - "name": The exact name of the dish.
                               - "price": The numerical price (e.g., if "S/ 25.00", return 25.00). If multiple sizes, pick the main one.
                               - "description": Any ingredients or description text below the name. Return "" if none.
                               - "category": Infer the category based on the section header (e.g., "Entradas", "Fondos", "Bebidas", "Postres", "Chifas", "Mariscos", "Otros").
                            3. **Ignore**: 
                               - Section headers themselves (don't list "Entradas" as a dish).
                               - Non-food text like phone numbers, addresses, or "Wi-Fi".
                            4. **Output Format**: Return ONLY a raw JSON array of objects. No markdown formatting.
                        
                            Example Input:
                            "Lomo Saltado ... S/. 35.00"
                            "Trozos de carne con cebolla y tomate"
                            
                            Example Output:
                            [{"name": "Lomo Saltado", "price": 35.00, "description": "Trozos de carne con cebolla y tomate", "category": "Fondos"}]`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                "url": dataUrl,
                                "detail": "high" // Force high res analysis
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
        });

        const textOutput = response.choices[0]?.message?.content?.trim() || "[]";

        // Clean potential markdown blocks just in case
        const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const data = JSON.parse(cleanJson);
            return NextResponse.json({ items: data });
        } catch (e) {
            console.error("Failed to parse OpenAI response:", textOutput);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: textOutput }, { status: 500 });
        }

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
