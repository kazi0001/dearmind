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

        const callWeek = body.call_week ? Number(body.call_week) : 1;
        const callTheme = body.call_theme || getDefaultThemeForWeek(callWeek);

        const { data: session, error: sessionError } = await supabaseAdmin
            .from("voice_call_sessions")
            .insert({
                family_id: body.family_id,
                parent_id: body.parent_id,
                schedule_id: body.schedule_id || null,
                call_week: callWeek,
                call_theme: callTheme,
                status: "started",
            })
            .select("id")
            .single();

        if (sessionError || !session) {
            return Response.json(
                {
                    ok: false,
                    error:
                        sessionError?.message || "Could not create voice call session.",
                },
                { status: 500 }
            );
        }

        const client = twilio(accountSid, authToken);

        const voiceUrl = new URL("/api/twilio/voice", siteUrl);
        voiceUrl.searchParams.set("session_id", session.id);

        const statusCallbackUrl = new URL("/api/twilio/call-status", siteUrl);
        statusCallbackUrl.searchParams.set("session_id", session.id);
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

        await supabaseAdmin
            .from("voice_call_sessions")
            .update({
                twilio_call_sid: call.sid,
                status: "initiated",
            })
            .eq("id", session.id);

        if (body.schedule_id) {
            await supabaseAdmin
                .from("call_schedule")
                .update({
                    status: "in_progress",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", body.schedule_id);
        }

        await supabaseAdmin.from("call_notes").insert({
            family_id: body.family_id,
            parent_id: body.parent_id,
            call_date: new Date().toISOString().slice(0, 10),
            call_week: callWeek,
            call_theme: callTheme,
            raw_notes: [
                "Automated DearMind guided call initiated.",
                `Twilio Call SID: ${call.sid}.`,
                `Voice session ID: ${session.id}.`,
                body.schedule_id ? `Schedule ID: ${body.schedule_id}.` : "",
            ]
                .filter(Boolean)
                .join("\n"),
            ai_summary: null,
            memory_highlights: null,
            sensitive_flag: false,
            reviewed: false,
        });

        return Response.json({
            ok: true,
            call_sid: call.sid,
            session_id: session.id,
            schedule_id: body.schedule_id || null,
            message: "Automated guided DearMind call started.",
        });
    } catch (error: any) {
        console.error("DearMind Twilio call error:", error);

        return Response.json(
            {
                ok: false,
                error:
                    error?.message ||
                    "Unexpected server error while starting Twilio call.",
                code: error?.code || null,
                moreInfo: error?.moreInfo || null,
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