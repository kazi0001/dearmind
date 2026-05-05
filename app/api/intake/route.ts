import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const requiredFields = [
            "buyer_name",
            "buyer_email",
            "parent_name",
            "parent_phone",
        ];

        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    {
                        ok: false,
                        error: `Missing required field: ${field}`,
                    },
                    { status: 400 }
                );
            }
        }

        const { data: familyData, error: familyError } = await supabaseAdmin
            .from("families")
            .insert({
                buyer_name: body.buyer_name,
                buyer_email: body.buyer_email,
                buyer_phone: body.buyer_phone || null,
                relationship_to_parent: body.relationship_to_parent || null,
                preferred_contact_method: "email",
                subscription_status: "pilot",
                notes: body.notes || null,
            })
            .select("id")
            .single();

        if (familyError) {
            return Response.json(
                {
                    ok: false,
                    step: "family_insert",
                    error: familyError.message,
                },
                { status: 500 }
            );
        }

        const { error: parentError } = await supabaseAdmin.from("parents").insert({
            family_id: familyData.id,
            parent_name: body.parent_name,
            parent_phone: body.parent_phone,
            parent_age: body.parent_age ? Number(body.parent_age) : null,
            parent_city: body.parent_city || null,
            preferred_call_day: body.preferred_call_day || null,
            preferred_call_time: body.preferred_call_time || null,
            consent_status: "pending",
            sharing_preference: body.sharing_preference || "family_summary_only",
            notes: body.notes || null,
        });

        if (parentError) {
            return Response.json(
                {
                    ok: false,
                    step: "parent_insert",
                    error: parentError.message,
                },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            family_id: familyData.id,
            message: "DearMind intake submitted successfully.",
        });
    } catch (error) {
        console.error("DearMind API intake error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while submitting intake.",
            },
            { status: 500 }
        );
    }
}