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
                            type: "text", text: `Analyze this menu image and extract all food and drink items.
                        Return ONLY a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.
                        Each object must have:
                        - name (string)
                        - price (number, just the value)
                        - description (string, or empty if none)
                        - category (string, guess one of: "Entradas", "Fondos", "Bebidas", "Postres", "Otros")
                        
                        Example: [{"name": "Ceviche", "price": 25.0, "description": "Fresco pescado", "category": "Entradas"}]` },
                        {
                            type: "image_url",
                            image_url: {
                                "url": dataUrl,
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
