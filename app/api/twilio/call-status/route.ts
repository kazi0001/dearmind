import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);

        const sessionId = url.searchParams.get("session_id");
        const familyId = url.searchParams.get("family_id");
        const parentId = url.searchParams.get("parent_id");

        const formData = await request.formData();

        const callSid = String(formData.get("CallSid") || "");
        const callStatus = String(formData.get("CallStatus") || "");
        const errorCode = String(formData.get("ErrorCode") || "");
        const errorMessage = String(formData.get("ErrorMessage") || "");

        if (sessionId) {
            await supabaseAdmin
                .from("voice_call_sessions")
                .update({
                    twilio_call_sid: callSid || null,
                    status: callStatus || "unknown",
                    completed_at:
                        callStatus === "completed" ||
                            callStatus === "failed" ||
                            callStatus === "busy" ||
                            callStatus === "no-answer" ||
                            callStatus === "canceled"
                            ? new Date().toISOString()
                            : null,
                })
                .eq("id", sessionId);
        }

        if (familyId && parentId && (callStatus || errorCode || errorMessage)) {
            await supabaseAdmin.from("call_notes").insert({
                family_id: familyId,
                parent_id: parentId,
                call_date: new Date().toISOString().slice(0, 10),
                call_week: null,
                call_theme: "Twilio call status",
                raw_notes: [
                    "Twilio call status callback received.",
                    `Call SID: ${callSid || "Not provided"}`,
                    `Status: ${callStatus || "Not provided"}`,
                    errorCode ? `Error code: ${errorCode}` : "",
                    errorMessage ? `Error message: ${errorMessage}` : "",
                    sessionId ? `Voice session ID: ${sessionId}` : "",
                ]
                    .filter(Boolean)
                    .join("\n"),
                ai_summary: null,
                memory_highlights: null,
                sensitive_flag: false,
                reviewed: false,
            });
        }

        return Response.json({
            ok: true,
            call_sid: callSid,
            call_status: callStatus,
            error_code: errorCode || null,
            error_message: errorMessage || null,
        });
    } catch (error: any) {
        console.error("DearMind Twilio call-status error:", error);

        return Response.json(
            {
                ok: false,
                error:
                    error?.message ||
                    "Unexpected server error while handling Twilio call status.",
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return Response.json({
        ok: true,
        message: "DearMind Twilio call-status endpoint is running.",
    });
}