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
        let promptContent: any[] = [];
        const fileType = file.type;

        // 1. IMAGE Handling
        if (fileType.startsWith('image/')) {
            const base64Image = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:${fileType};base64,${base64Image}`;
            promptContent = [
                {
                    type: "text",
                    text: `Analyze this restaurant menu image. 
                    Target: Extract ALL distinct food and drink items.
                    
                    Required Fields per item:
                    - "name" (string): Exact name of the dish.
                    - "price" (number): The price. If multiple sizes, use the base price.
                    - "description" (string): Ingredients or details listed. Empty if none.
                    - "category" (string): The section header it belongs to (e.g. "Entradas", "Fondos", "Bebidas"). Infer if missing.

                    Output Format:
                    Return ONLY a JSON object with a single key "items" containing the array of objects.
                    Example: { "items": [{ "name": "Ceviche", "price": 25, "category": "Marinos", "description": "Con camote y choclo" }] }`
                },
                {
                    type: "image_url",
                    image_url: { "url": dataUrl, "detail": "high" }
                }
            ];
        }
        // 2. PDF Handling
        else if (fileType === 'application/pdf') {
            // @ts-ignore
            const pdf = require('pdf-parse');
            const pdfData = await pdf(Buffer.from(buffer));
            const text = pdfData.text;

            promptContent = [{
                type: "text",
                text: `Analyze this restaurant menu text extracted from a PDF.
                Target: Extract ALL distinct food and drink items.

                Required Fields: "name", "price" (number), "description", "category".

                Output Format:
                Return ONLY a JSON object with a key "items".
                Example: { "items": [{ "name": "Lomo Saltado", "price": 30, "category": "Criollo", "description": "Con papas fritas" }] }
                
                MENU CONTENT:
                ${text.slice(0, 20000)}`
            }];
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Only Images and PDFs are allowed.' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: promptContent }],
            max_tokens: 4000,
            temperature: 0, // Deterministic
            response_format: { type: "json_object" }
        });

        const textOutput = response.choices[0]?.message?.content || "{}";

        try {
            const data = JSON.parse(textOutput);

            if (data.error) {
                return NextResponse.json({ error: data.error }, { status: 400 });
            }

            const items = data.items || [];
            return NextResponse.json({ items: items });

        } catch (e) {
            console.error("Failed to parse OpenAI response:", textOutput);
            return NextResponse.json({ error: 'Failed to parse AI response', raw: textOutput }, { status: 500 });
        }

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
