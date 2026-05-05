import { cookies } from "next/headers";
import OpenAI from "openai";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        if (!process.env.OPENAI_API_KEY) {
            return Response.json(
                { ok: false, error: "OPENAI_API_KEY is not configured." },
                { status: 500 }
            );
        }

        const body = await request.json();

        if (!body.raw_notes) {
            return Response.json(
                { ok: false, error: "raw_notes is required." },
                { status: 400 }
            );
        }

        const prompt = `
You are helping DearMind summarize a friendly family-memory call.

DearMind is not a medical, emergency, legal, financial, political, or therapy service.
Avoid extracting sensitive details. If the transcript contains sensitive content, set sensitive_flag to true and explain briefly.

Return ONLY valid JSON with this structure:
{
  "ai_summary": "A warm, factual 4-6 sentence summary of the call.",
  "memory_highlights": "3-5 short bullet-style memory highlights, each starting with 'Do not forget:'",
  "sensitive_flag": false,
  "sensitive_reason": "Brief reason, or empty string if none."
}

Raw notes or transcript:
${body.raw_notes}
`;

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: prompt,
            temperature: 0.3,
        });

        const outputText = response.output_text || "";

        let parsed;

        try {
            parsed = JSON.parse(outputText);
        } catch {
            const cleaned = outputText
                .replace(/^```json/i, "")
                .replace(/^```/i, "")
                .replace(/```$/i, "")
                .trim();

            parsed = JSON.parse(cleaned);
        }

        return Response.json({
            ok: true,
            ai_summary: parsed.ai_summary || "",
            memory_highlights: parsed.memory_highlights || "",
            sensitive_flag: Boolean(parsed.sensitive_flag),
            sensitive_reason: parsed.sensitive_reason || "",
        });
    } catch (error: any) {
        console.error("DearMind summarize-call error:", error);

        return Response.json(
            {
                ok: false,
                error:
                    error?.message ||
                    "Unexpected server error while summarizing call notes.",
            },
            { status: 500 }
        );
    }
}