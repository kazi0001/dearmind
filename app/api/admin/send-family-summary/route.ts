import { cookies } from "next/headers";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const authorized = await isAdminAuthorized();

        if (!authorized) {
            return Response.json(
                { ok: false, error: "Unauthorized." },
                { status: 401 }
            );
        }

        if (!process.env.RESEND_API_KEY) {
            return Response.json(
                { ok: false, error: "RESEND_API_KEY is not configured." },
                { status: 500 }
            );
        }

        if (!process.env.DEARMIND_FROM_EMAIL) {
            return Response.json(
                { ok: false, error: "DEARMIND_FROM_EMAIL is not configured." },
                { status: 500 }
            );
        }

        const body = await request.json();

        if (!body.summary_id) {
            return Response.json(
                { ok: false, error: "summary_id is required." },
                { status: 400 }
            );
        }

        const { data: summary, error: summaryError } = await supabaseAdmin
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
            .eq("id", body.summary_id)
            .single();

        if (summaryError || !summary) {
            return Response.json(
                {
                    ok: false,
                    error: summaryError?.message || "Family summary not found.",
                },
                { status: 500 }
            );
        }

        if (!summary.summary_text?.trim()) {
            return Response.json(
                { ok: false, error: "Family summary text is empty." },
                { status: 400 }
            );
        }

        const { data: family, error: familyError } = await supabaseAdmin
            .from("families")
            .select("buyer_name, buyer_email")
            .eq("id", summary.family_id)
            .single();

        if (familyError || !family) {
            return Response.json(
                {
                    ok: false,
                    error: familyError?.message || "Family record not found.",
                },
                { status: 500 }
            );
        }

        const { data: parent, error: parentError } = await supabaseAdmin
            .from("parents")
            .select("parent_name")
            .eq("id", summary.parent_id)
            .single();

        if (parentError || !parent) {
            return Response.json(
                {
                    ok: false,
                    error: parentError?.message || "Parent record not found.",
                },
                { status: 500 }
            );
        }

        const subject = `DearMind monthly family summary for ${parent.parent_name}`;

        const plainText = `Hello ${family.buyer_name},

Here is the DearMind family summary for ${parent.parent_name} for ${summary.summary_month}.

${summary.summary_text}

With warmth,
DearMind`;

        const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">DearMind Monthly Family Summary</h1>
        <p style="margin-top: 0; color: #6b7280;">For ${parent.parent_name} · ${summary.summary_month}</p>

        <p>Hello ${family.buyer_name},</p>

        <p>Here is this month’s reviewed DearMind family summary.</p>

        <div style="background: #fffaf0; border: 1px solid #fde68a; border-radius: 16px; padding: 18px; white-space: pre-wrap;">
${escapeHtml(summary.summary_text)}
        </div>

        <p style="margin-top: 24px;">With warmth,<br />DearMind</p>

        <p style="font-size: 12px; color: #6b7280; margin-top: 28px;">
          DearMind is a family memory and connection service. This summary is intended for family reflection only and is not medical, legal, financial, or emergency guidance.
        </p>
      </div>
    `;

        const emailResult = await resend.emails.send({
            from: process.env.DEARMIND_FROM_EMAIL,
            to: family.buyer_email,
            subject,
            text: plainText,
            html,
        });

        if (emailResult.error) {
            return Response.json(
                {
                    ok: false,
                    error: emailResult.error.message,
                },
                { status: 500 }
            );
        }

        const { error: updateError } = await supabaseAdmin
            .from("family_summaries")
            .update({
                status: "sent",
            })
            .eq("id", summary.id);

        if (updateError) {
            return Response.json(
                {
                    ok: false,
                    error: updateError.message,
                },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            email_id: emailResult.data?.id || null,
            message: `Family summary sent to ${family.buyer_email}.`,
        });
    } catch (error: any) {
        console.error("DearMind send family summary error:", error);

        return Response.json(
            {
                ok: false,
                error:
                    error?.message ||
                    "Unexpected server error while sending family summary.",
            },
            { status: 500 }
        );
    }
}

function escapeHtml(input: string) {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}