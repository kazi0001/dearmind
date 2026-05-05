import { cookies } from "next/headers";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function buildFallbackFamilySummary({
    parentName,
    month,
    callNotes,
}: {
    parentName: string;
    month: string;
    callNotes: any[];
}) {
    if (!callNotes.length) {
        return `Family summary for ${parentName}, ${month}

No call notes were available for this month yet.

Once weekly conversations are added, DearMind will prepare a short family-facing summary that highlights warm memories, daily-life updates, and family connection points while avoiding sensitive details.`;
    }

    const highlights = callNotes
        .map((note, index) => {
            const summary = note.ai_summary || note.raw_notes || "No summary available.";
            const memory = note.memory_highlights || "";
            return `Call ${index + 1}: ${summary}${memory ? `\nMemory highlights: ${memory}` : ""}`;
        })
        .join("\n\n");

    return `Family summary for ${parentName}, ${month}

This month’s conversations reflected several meaningful daily-life and family-memory moments.

${highlights}

Overall, the conversations suggest that familiar routines, family memories, and small personal stories are valuable themes to preserve. No sensitive details should be shared without review and approval.`;
}

async function generateAiFamilySummary({
    parentName,
    month,
    callNotes,
}: {
    parentName: string;
    month: string;
    callNotes: any[];
}) {
    if (!process.env.OPENAI_API_KEY) {
        return buildFallbackFamilySummary({ parentName, month, callNotes });
    }

    const callNotesText = callNotes
        .map((note, index) => {
            return `
CALL ${index + 1}
Date: ${note.call_date || "Not provided"}
Week: ${note.call_week || "Not provided"}
Theme: ${note.call_theme || "Conversation"}
Summary: ${note.ai_summary || "No summary provided"}
Memory highlights: ${note.memory_highlights || "No memory highlights provided"}
Raw notes: ${note.raw_notes || "No raw notes provided"}
Sensitive flag: ${note.sensitive_flag ? "Yes" : "No"}
Reviewed: ${note.reviewed ? "Yes" : "No"}
`;
        })
        .join("\n---\n");

    const prompt = `
You are preparing a DearMind monthly family-facing summary.

DearMind helps families preserve memories through weekly conversations and monthly handwritten-style letters.

The parent or older adult is named ${parentName}.
The month is ${month}.

Write a summary for the adult child or family subscriber.

Important rules:
- Be warm, respectful, and concise.
- Do not sound clinical.
- Do not include raw transcript language.
- Do not reveal sensitive medical, financial, legal, political, religious, or highly private details.
- Do not invent facts.
- Use only details from the call notes.
- Focus on emotional tone, family connection, routines, memories, and topics worth preserving.
- If sensitive topics appear, mention only: "A sensitive topic was noted and should be reviewed before sharing further."
- Keep the summary around 180 to 280 words.
- Include a short "Memory highlights" section with 3 to 5 bullets.
- Include a short "Review note" at the end.

Call notes:
${callNotesText}

Return only the family summary text. No JSON. No explanation.
`;

    try {
        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: prompt,
            temperature: 0.45,
        });

        const summaryText = response.output_text?.trim();

        if (!summaryText) {
            return buildFallbackFamilySummary({ parentName, month, callNotes });
        }

        return summaryText;
    } catch (error) {
        console.error("DearMind AI family summary generation failed:", error);
        return buildFallbackFamilySummary({ parentName, month, callNotes });
    }
}

export async function GET(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const parentId = searchParams.get("parent_id");

        let query = supabaseAdmin
            .from("family_summaries")
            .select(
                `
        id,
        family_id,
        parent_id,
        summary_month,
        summary_text,
        status,
        created_at
      `
            )
            .order("created_at", { ascending: false });

        if (parentId) {
            query = query.eq("parent_id", parentId);
        }

        const { data, error } = await query;

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            family_summaries: data || [],
        });
    } catch (error) {
        console.error("DearMind family summaries GET error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while loading family summaries.",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const requiredFields = ["family_id", "parent_id", "summary_month"];

        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { ok: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const { data: parentData, error: parentError } = await supabaseAdmin
            .from("parents")
            .select("parent_name")
            .eq("id", body.parent_id)
            .single();

        if (parentError) {
            return Response.json(
                { ok: false, error: parentError.message },
                { status: 500 }
            );
        }

        const monthStart = `${body.summary_month}-01`;
        const selectedDate = new Date(monthStart);

        const nextMonthDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            1
        );

        const nextMonth = nextMonthDate.toISOString().slice(0, 10);

        const { data: callNotes, error: notesError } = await supabaseAdmin
            .from("call_notes")
            .select(
                `
        id,
        call_date,
        call_week,
        call_theme,
        raw_notes,
        ai_summary,
        memory_highlights,
        sensitive_flag,
        reviewed
      `
            )
            .eq("parent_id", body.parent_id)
            .gte("call_date", monthStart)
            .lt("call_date", nextMonth)
            .order("call_date", { ascending: true });

        if (notesError) {
            return Response.json(
                { ok: false, error: notesError.message },
                { status: 500 }
            );
        }

        const summaryText =
            body.summary_text ||
            (await generateAiFamilySummary({
                parentName: parentData.parent_name,
                month: body.summary_month,
                callNotes: callNotes || [],
            }));

        const { data: summaryData, error: summaryError } = await supabaseAdmin
            .from("family_summaries")
            .insert({
                family_id: body.family_id,
                parent_id: body.parent_id,
                summary_month: body.summary_month,
                summary_text: summaryText,
                status: "draft",
            })
            .select("id")
            .single();

        if (summaryError) {
            return Response.json(
                { ok: false, error: summaryError.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            summary_id: summaryData.id,
            summary_text: summaryText,
            call_notes_count: callNotes?.length || 0,
            message: "Family summary generated successfully.",
        });
    } catch (error) {
        console.error("DearMind family summaries POST error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while generating family summary.",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const body = await request.json();

        if (!body.summary_id) {
            return Response.json(
                { ok: false, error: "summary_id is required." },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {};

        if (typeof body.summary_text === "string") {
            updatePayload.summary_text = body.summary_text;
        }

        if (typeof body.status === "string") {
            updatePayload.status = body.status;
        }

        const { data, error } = await supabaseAdmin
            .from("family_summaries")
            .update(updatePayload)
            .eq("id", body.summary_id)
            .select(
                `
        id,
        family_id,
        parent_id,
        summary_month,
        summary_text,
        status,
        created_at
      `
            )
            .single();

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            family_summary: data,
            message: "Family summary updated successfully.",
        });
    } catch (error) {
        console.error("DearMind family summaries PATCH error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while updating family summary.",
            },
            { status: 500 }
        );
    }
}