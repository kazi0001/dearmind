import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("families")
            .select(
                `
        id,
        buyer_name,
        buyer_email,
        buyer_phone,
        relationship_to_parent,
        subscription_status,
        notes,
        created_at,
        parents (
          id,
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
        )
      `
            )
            .order("created_at", { ascending: false });

        if (error) {
            return Response.json(
                {
                    ok: false,
                    error: error.message,
                },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            families: data,
        });
    } catch (error) {
        console.error("DearMind admin families error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while loading families.",
            },
            { status: 500 }
        );
    }
}