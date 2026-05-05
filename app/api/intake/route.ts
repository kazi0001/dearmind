import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);

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

        const emailResult = await sendIntakeConfirmationEmail({
            buyerName: body.buyer_name,
            buyerEmail: body.buyer_email,
            parentName: body.parent_name,
            preferredCallDay: body.preferred_call_day || "",
            preferredCallTime: body.preferred_call_time || "",
        });

        return Response.json({
            ok: true,
            family_id: familyData.id,
            email_sent: emailResult.sent,
            email_error: emailResult.error,
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

async function sendIntakeConfirmationEmail({
    buyerName,
    buyerEmail,
    parentName,
    preferredCallDay,
    preferredCallTime,
}: {
    buyerName: string;
    buyerEmail: string;
    parentName: string;
    preferredCallDay: string;
    preferredCallTime: string;
}) {
    try {
        if (!process.env.RESEND_API_KEY || !process.env.DEARMIND_FROM_EMAIL) {
            console.warn(
                "DearMind intake confirmation email skipped because Resend is not configured."
            );

            return {
                sent: false,
                error: "Email not configured.",
            };
        }

        const subject = "We received your DearMind pilot intake";

        const callPreference =
            preferredCallDay || preferredCallTime
                ? `${preferredCallDay || "Selected day not provided"} ${preferredCallTime || ""
                    }`.trim()
                : "Not provided yet";

        const plainText = `Hello ${buyerName},

Thank you for joining the DearMind founding family pilot.

We received your intake form for ${parentName}. The next step is a welcome and consent check before regular memory calls begin.

DearMind focuses on family memory, connection, and reviewed monthly letters. It is not a medical, emergency, legal, financial, or monitoring service.

Preferred call time: ${callPreference}

We’ll follow up soon with next steps.

With warmth,
DearMind`;

        const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to the DearMind founding family pilot</h1>

        <p>Hello ${escapeHtml(buyerName)},</p>

        <p>Thank you for joining the DearMind founding family pilot. We received your intake form for <strong>${escapeHtml(
            parentName
        )}</strong>.</p>

        <div style="background: #fffaf0; border: 1px solid #fde68a; border-radius: 16px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next step:</strong> We’ll complete a welcome and consent check before regular memory calls begin.</p>
          <p style="margin: 12px 0 0;"><strong>Preferred call time:</strong> ${escapeHtml(
            callPreference
        )}</p>
        </div>

        <p>DearMind helps families preserve memories through guided conversations, reviewed summaries, and monthly handwritten-style letters.</p>

        <p>Please note that DearMind is not a medical, emergency, legal, financial, or monitoring service. It is a family memory and connection service.</p>

        <p>We’ll follow up soon with next steps.</p>

        <p style="margin-top: 24px;">With warmth,<br />DearMind</p>
      </div>
    `;

        const emailResult = await resend.emails.send({
            from: process.env.DEARMIND_FROM_EMAIL,
            to: buyerEmail,
            subject,
            text: plainText,
            html,
        });

        if (emailResult.error) {
            console.error("DearMind intake confirmation email error:", emailResult.error);

            return {
                sent: false,
                error: emailResult.error.message,
            };
        }

        return {
            sent: true,
            error: null,
        };
    } catch (error: any) {
        console.error("DearMind intake confirmation email failed:", error);

        return {
            sent: false,
            error: error?.message || "Email sending failed.",
        };
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