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
        const month = searchParams.get("month");

        if (!parentId) {
            return Response.json(
                { ok: false, error: "parent_id is required." },
                { status: 400 }
            );
        }

        if (!month) {
            return Response.json(
                { ok: false, error: "month is required in YYYY-MM format." },
                { status: 400 }
            );
        }

        const monthStart = `${month}-01`;
        const selectedDate = new Date(`${monthStart}T12:00:00`);

        const nextMonthDate = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth() + 1,
            1
        );

        const nextMonth = nextMonthDate.toISOString().slice(0, 10);

        const { data, error } = await supabaseAdmin
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
            .eq("parent_id", parentId)
            .gte("call_date", monthStart)
            .lt("call_date", nextMonth)
            .order("call_date", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        const callNotes = data || [];

        const stats = {
            total: callNotes.length,
            reviewed: callNotes.filter((note) => note.reviewed).length,
            not_reviewed: callNotes.filter((note) => !note.reviewed).length,
            summarized: callNotes.filter((note) => Boolean(note.ai_summary)).length,
            unsummarized: callNotes.filter((note) => !note.ai_summary).length,
            sensitive: callNotes.filter((note) => note.sensitive_flag).length,
            with_memory_highlights: callNotes.filter((note) =>
                Boolean(note.memory_highlights)
            ).length,
        };

        return Response.json({
            ok: true,
            month,
            month_start: monthStart,
            next_month: nextMonth,
            stats,
            call_notes: callNotes,
        });
    } catch (error) {
        console.error("DearMind monthly call notes GET error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while loading monthly call notes.",
            },
            { status: 500 }
        );
    }
}