import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
}

const allowedConsentStatuses = ["pending", "consented", "declined", "paused"];

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

        if (!body.parent_id) {
            return Response.json(
                { ok: false, error: "parent_id is required." },
                { status: 400 }
            );
        }

        if (
            body.consent_status &&
            !allowedConsentStatuses.includes(body.consent_status)
        ) {
            return Response.json(
                {
                    ok: false,
                    error:
                        "Invalid consent_status. Use pending, consented, declined, or paused.",
                },
                { status: 400 }
            );
        }

        const updatePayload: Record<string, any> = {};

        if (typeof body.consent_status === "string") {
            updatePayload.consent_status = body.consent_status;
        }

        if (typeof body.notes === "string") {
            updatePayload.notes = body.notes;
        }

        const { data, error } = await supabaseAdmin
            .from("parents")
            .update(updatePayload)
            .eq("id", body.parent_id)
            .select(
                `
        id,
        family_id,
        parent_name,
        parent_phone,
        parent_age,
        parent_city,
        preferred_call_day,
        preferred_call_time,
        consent_status,
        sharing_preference,
        notes,
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
            parent: data,
            message: "Parent profile updated successfully.",
        });
    } catch (error) {
        console.error("DearMind parent PATCH error:", error);

        return Response.json(
            { ok: false, error: "Unexpected server error while updating parent." },
            { status: 500 }
        );
    }
}