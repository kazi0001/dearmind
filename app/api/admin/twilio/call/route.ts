import { cookies } from "next/headers";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdminAuthorized() {
    const cookieStore = await cookies();
    return cookieStore.get("dearmind_admin")?.value === "authorized";
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

        const requiredFields = ["family_id", "parent_id", "parent_phone"];

        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { ok: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

        if (!accountSid || !authToken || !twilioPhoneNumber || !siteUrl) {
            return Response.json(
                {
                    ok: false,
                    error:
                        "Missing Twilio configuration. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and NEXT_PUBLIC_SITE_URL.",
                },
                { status: 500 }
            );
        }

        const client = twilio(accountSid, authToken);

        const voiceUrl = new URL("/api/twilio/voice", siteUrl);
        voiceUrl.searchParams.set("family_id", body.family_id);
        voiceUrl.searchParams.set("parent_id", body.parent_id);
        voiceUrl.searchParams.set("call_week", body.call_week || "1");
        voiceUrl.searchParams.set(
            "call_theme",
            body.call_theme || "Present life and daily activities"
        );

        const statusCallbackUrl = new URL("/api/twilio/call-status", siteUrl);
        statusCallbackUrl.searchParams.set("family_id", body.family_id);
        statusCallbackUrl.searchParams.set("parent_id", body.parent_id);

        const call = await client.calls.create({
            to: body.parent_phone,
            from: twilioPhoneNumber,
            url: voiceUrl.toString(),
            method: "POST",
            statusCallback: statusCallbackUrl.toString(),
            statusCallbackMethod: "POST",
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        });

        await supabaseAdmin.from("call_notes").insert({
            family_id: body.family_id,
            parent_id: body.parent_id,
            call_date: new Date().toISOString().slice(0, 10),
            call_week: body.call_week ? Number(body.call_week) : null,
            call_theme: body.call_theme || "Twilio outbound call",
            raw_notes: `Outbound Twilio call initiated. Twilio Call SID: ${call.sid}`,
            ai_summary: null,
            memory_highlights: null,
            sensitive_flag: false,
            reviewed: false,
        });

        return Response.json({
            ok: true,
            call_sid: call.sid,
            message: "Twilio call started.",
        });
    } catch (error) {
        console.error("DearMind Twilio call error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while starting Twilio call.",
            },
            { status: 500 }
        );
    }
}