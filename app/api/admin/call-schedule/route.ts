import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
}

const allowedStatuses = [
    "scheduled",
    "in_progress",
    "completed",
    "missed",
    "skipped",
];

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
        const status = searchParams.get("status");

        let query = supabaseAdmin
            .from("call_schedule")
            .select(
                `
        id,
        family_id,
        parent_id,
        scheduled_date,
        call_week,
        call_theme,
        status,
        notes,
        created_at,
        updated_at,
        families (
          buyer_name,
          buyer_email
        ),
        parents (
          parent_name,
          parent_phone,
          consent_status,
          preferred_call_day,
          preferred_call_time
        )
      `
            )
            .order("scheduled_date", { ascending: true })
            .order("created_at", { ascending: true });

        if (parentId) {
            query = query.eq("parent_id", parentId);
        }

        if (status) {
            query = query.eq("status", status);
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
            scheduled_calls: data || [],
        });
    } catch (error) {
        console.error("DearMind call schedule GET error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while loading call schedule.",
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

        const requiredFields = ["family_id", "parent_id", "scheduled_date"];

        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { ok: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const { data, error } = await supabaseAdmin
            .from("call_schedule")
            .insert({
                family_id: body.family_id,
                parent_id: body.parent_id,
                scheduled_date: body.scheduled_date,
                call_week: body.call_week ? Number(body.call_week) : null,
                call_theme: body.call_theme || getDefaultThemeForWeek(Number(body.call_week || 1)),
                status: body.status || "scheduled",
                notes: body.notes || null,
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
            schedule_id: data.id,
            message: "Call scheduled successfully.",
        });
    } catch (error) {
        console.error("DearMind call schedule POST error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while creating call schedule.",
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

        if (!body.schedule_id) {
            return Response.json(
                { ok: false, error: "schedule_id is required." },
                { status: 400 }
            );
        }

        if (body.status && !allowedStatuses.includes(body.status)) {
            return Response.json(
                {
                    ok: false,
                    error: "Invalid status. Use scheduled, completed, missed, or skipped.",
                },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (typeof body.scheduled_date === "string") {
            updatePayload.scheduled_date = body.scheduled_date;
        }

        if (body.call_week !== undefined) {
            updatePayload.call_week = body.call_week ? Number(body.call_week) : null;
        }

        if (typeof body.call_theme === "string") {
            updatePayload.call_theme = body.call_theme;
        }

        if (typeof body.status === "string") {
            updatePayload.status = body.status;
        }

        if (typeof body.notes === "string") {
            updatePayload.notes = body.notes;
        }

        const { data, error } = await supabaseAdmin
            .from("call_schedule")
            .update(updatePayload)
            .eq("id", body.schedule_id)
            .select(
                `
        id,
        family_id,
        parent_id,
        scheduled_date,
        call_week,
        call_theme,
        status,
        notes,
        created_at,
        updated_at
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
            scheduled_call: data,
            message: "Call schedule updated successfully.",
        });
    } catch (error) {
        console.error("DearMind call schedule PATCH error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while updating call schedule.",
            },
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

        if (!body.schedule_id) {
            return Response.json(
                { ok: false, error: "schedule_id is required." },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("call_schedule")
            .delete()
            .eq("id", body.schedule_id);

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            message: "Scheduled call deleted successfully.",
        });
    } catch (error) {
        console.error("DearMind call schedule DELETE error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while deleting scheduled call.",
            },
            { status: 500 }
        );
    }
}

function getDefaultThemeForWeek(callWeek: number) {
    if (callWeek === 1) return "Present life and daily activities";
    if (callWeek === 2) return "Family connection";
    if (callWeek === 3) return "Life memory";
    if (callWeek === 4) return "Monthly letter preparation";
    return "Present life and daily activities";
}