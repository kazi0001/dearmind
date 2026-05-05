import { supabase } from "@/lib/supabaseClient";

export async function GET() {
    const { data, error } = await supabase
        .from("families")
        .select("id, buyer_name, buyer_email, created_at")
        .limit(5);

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
}