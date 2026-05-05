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

function buildFallbackLetterDraft({
    parentName,
    month,
    callNotes,
}: {
    parentName: string;
    month: string;
    callNotes: any[];
}) {
    const notesText = callNotes
        .map((note, index) => {
            return [
                `Call ${index + 1}: ${note.call_theme || "Conversation"}`,
                note.ai_summary ? `Summary: ${note.ai_summary}` : "",
                note.memory_highlights ? `Memory: ${note.memory_highlights}` : "",
                note.raw_notes ? `Notes: ${note.raw_notes}` : "",
            ]
                .filter(Boolean)
                .join("\n");
        })
        .join("\n\n");

    if (!callNotes.length) {
        return `Dear ${parentName},

I hope this letter finds you well. This month, we are just beginning your DearMind memory journey. In the coming weeks, we will gather small stories, daily moments, family memories, and reflections that can be preserved with care.

Every life contains details worth remembering: the people you love, the places that shaped you, the routines that bring comfort, and the stories your family will treasure.

With warmth,
DearMind`;
    }

    return `Dear ${parentName},

I have been thinking about the moments you shared during ${month}. What stood out most was not only the information itself, but the warmth behind it: the ordinary details of daily life, the family connections that matter to you, and the memories that deserve to be preserved.

This month’s conversations included the following themes:

${notesText}

Together, these moments create a small but meaningful picture of your life right now. They remind us that family memory is not built only from major events. It is also built from simple routines, familiar names, favorite places, small joys, and stories that may otherwise pass quietly.

Thank you for sharing these pieces of your life. They matter, and they are worth remembering.

With warmth,
DearMind`;
}

async function generateAiLetterDraft({
    parentName,
    month,
    callNotes,
}: {
    parentName: string;
    month: string;
    callNotes: any[];
}) {
    if (!process.env.OPENAI_API_KEY) {
        return buildFallbackLetterDraft({ parentName, month, callNotes });
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
You are writing a DearMind monthly letter.

DearMind turns weekly family-memory conversations into warm monthly letters.
The reader is the parent or older adult named ${parentName}.
The month is ${month}.

Important rules:
- Write in a warm, respectful, personal tone.
- Do not sound like a clinical report.
- Do not mention AI, transcripts, databases, or call notes.
- Do not invent facts.
- Use only details provided in the call notes.
- Avoid medical, financial, legal, political, or highly sensitive content.
- If a sensitive topic appears, refer to it gently or omit it unless it is clearly appropriate.
- Keep the letter around 300 to 450 words.
- Make the letter feel like a thoughtful monthly reflection.
- Include specific memories, family names, routines, foods, places, or small moments if provided.
- End with a warm closing from DearMind.

Call notes:
${callNotesText}

Return only the letter text. No JSON. No explanation.
`;

    try {
        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: prompt,
            temperature: 0.6,
        });

        const draftText = response.output_text?.trim();

        if (!draftText) {
            return buildFallbackLetterDraft({ parentName, month, callNotes });
        }

        return draftText;
    } catch (error) {
        console.error("DearMind AI letter generation failed:", error);
        return buildFallbackLetterDraft({ parentName, month, callNotes });
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
            .from("letters")
            .select(
                `
        id,
        family_id,
        parent_id,
        letter_month,
        draft_text,
        final_text,
        status,
        human_reviewed,
        mailed_date,
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
            letters: data || [],
        });
    } catch (error) {
        console.error("DearMind letters GET error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while loading letters." },
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

        const requiredFields = ["family_id", "parent_id", "letter_month"];

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

        const monthStart = `${body.letter_month}-01`;
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

        const draftText =
            body.draft_text ||
            (await generateAiLetterDraft({
                parentName: parentData.parent_name,
                month: body.letter_month,
                callNotes: callNotes || [],
            }));

        const { data: letterData, error: letterError } = await supabaseAdmin
            .from("letters")
            .insert({
                family_id: body.family_id,
                parent_id: body.parent_id,
                letter_month: body.letter_month,
                draft_text: draftText,
                final_text: body.final_text || null,
                status: "draft",
                human_reviewed: false,
                mailed_date: null,
            })
            .select("id")
            .single();

        if (letterError) {
            return Response.json(
                { ok: false, error: letterError.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            letter_id: letterData.id,
            draft_text: draftText,
            call_notes_count: callNotes?.length || 0,
            generation_mode: process.env.OPENAI_API_KEY ? "ai" : "fallback_template",
            message: "Letter draft generated successfully.",
        });
    } catch (error) {
        console.error("DearMind letters POST error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while generating letter." },
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

        if (!body.letter_id) {
            return Response.json(
                { ok: false, error: "letter_id is required." },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {};

        if (typeof body.final_text === "string") {
            updatePayload.final_text = body.final_text;
        }

        if (typeof body.status === "string") {
            updatePayload.status = body.status;
        }

        if (typeof body.human_reviewed === "boolean") {
            updatePayload.human_reviewed = body.human_reviewed;
        }

        if (body.mailed_date !== undefined) {
            updatePayload.mailed_date = body.mailed_date || null;
        }

        const { data, error } = await supabaseAdmin
            .from("letters")
            .update(updatePayload)
            .eq("id", body.letter_id)
            .select(
                `
        id,
        family_id,
        parent_id,
        letter_month,
        draft_text,
        final_text,
        status,
        human_reviewed,
        mailed_date,
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
            letter: data,
            message: "Letter updated successfully.",
        });
    } catch (error) {
        console.error("DearMind letters PATCH error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while updating letter." },
            { status: 500 }
        );
    }
}
export async function DELETE(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        const body = await request.json();

        if (!body.letter_id) {
            return Response.json(
                { ok: false, error: "letter_id is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("letters")
            .delete()
            .eq("id", body.letter_id);

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            message: "Letter deleted successfully.",
        });
    } catch (error) {
        console.error("DearMind letters DELETE error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while deleting letter." },
            { status: 500 }
        );
    }
}