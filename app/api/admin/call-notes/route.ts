import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
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
            .from("call_notes")
            .select(
                `
        id,
        family_id,
        parent_id,
        call_date,
        call_week,
        call_theme,
        raw_notes,
        ai_summary,
        memory_highlights,
        sensitive_flag,
        reviewed,
        created_at
      `
            )
            .order("call_date", { ascending: false })
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
            call_notes: data || [],
        });
    } catch (error) {
        console.error("DearMind call notes GET error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while loading call notes." },
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

        const requiredFields = ["family_id", "parent_id", "call_date", "raw_notes"];

        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { ok: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const { data, error } = await supabaseAdmin
            .from("call_notes")
            .insert({
                family_id: body.family_id,
                parent_id: body.parent_id,
                call_date: body.call_date,
                call_week: body.call_week ? Number(body.call_week) : null,
                call_theme: body.call_theme || null,
                raw_notes: body.raw_notes,
                ai_summary: body.ai_summary || null,
                memory_highlights: body.memory_highlights || null,
                sensitive_flag: Boolean(body.sensitive_flag),
                reviewed: Boolean(body.reviewed),
            })
            .select("id")
            .single();

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            call_note_id: data.id,
            message: "Call note saved successfully.",
        });
    } catch (error) {
        console.error("DearMind call notes POST error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while saving call note." },
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

        if (!body.call_note_id) {
            return Response.json(
                { ok: false, error: "call_note_id is required." },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {};

        if (typeof body.ai_summary === "string") {
            updatePayload.ai_summary = body.ai_summary;
        }

        if (typeof body.memory_highlights === "string") {
            updatePayload.memory_highlights = body.memory_highlights;
        }

        if (typeof body.sensitive_flag === "boolean") {
            updatePayload.sensitive_flag = body.sensitive_flag;
        }

        if (typeof body.reviewed === "boolean") {
            updatePayload.reviewed = body.reviewed;
        }

        const { data, error } = await supabaseAdmin
            .from("call_notes")
            .update(updatePayload)
            .eq("id", body.call_note_id)
            .select(
                `
        id,
        family_id,
        parent_id,
        call_date,
        call_week,
        call_theme,
        raw_notes,
        ai_summary,
        memory_highlights,
        sensitive_flag,
        reviewed,
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
            call_note: data,
            message: "Call note updated successfully.",
        });
    } catch (error) {
        console.error("DearMind call notes PATCH error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while updating call note." },
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

        if (!body.call_note_id) {
            return Response.json(
                { ok: false, error: "call_note_id is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("call_notes")
            .delete()
            .eq("id", body.call_note_id);

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            message: "Call note deleted successfully.",
        });
    } catch (error) {
        console.error("DearMind call notes DELETE error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while deleting call note." },
            { status: 500 }
        );
    }
}