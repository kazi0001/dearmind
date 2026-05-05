import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);

        const familyId = url.searchParams.get("family_id");
        const parentId = url.searchParams.get("parent_id");
        const callWeek = url.searchParams.get("call_week");
        const callTheme = url.searchParams.get("call_theme");

        const formData = await request.formData();

        const recordingUrl = String(formData.get("RecordingUrl") || "");
        const recordingSid = String(formData.get("RecordingSid") || "");
        const recordingDuration = String(formData.get("RecordingDuration") || "");
        const callSid = String(formData.get("CallSid") || "");

        if (!familyId || !parentId) {
            return Response.json(
                { ok: false, error: "Missing family_id or parent_id." },
                { status: 400 }
            );
        }

        const noteText = [
            "Twilio recording received.",
            `Call SID: ${callSid}`,
            `Recording SID: ${recordingSid}`,
            `Recording duration: ${recordingDuration || "unknown"} seconds`,
            recordingUrl ? `Recording URL: ${recordingUrl}.mp3` : "",
        ]
            .filter(Boolean)
            .join("\n");

        const { error } = await supabaseAdmin.from("call_notes").insert({
            family_id: familyId,
            parent_id: parentId,
            call_date: new Date().toISOString().slice(0, 10),
            call_week: callWeek ? Number(callWeek) : null,
            call_theme: callTheme || "Twilio recorded memory response",
            raw_notes: noteText,
            ai_summary: null,
            memory_highlights: null,
            sensitive_flag: false,
            reviewed: false,
        });

        if (error) {
            return Response.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        return Response.json({
            ok: true,
            message: "Recording saved as call note.",
            recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
        });
    } catch (error) {
        console.error("DearMind Twilio recording callback error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error while saving recording callback.",
            },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    return POST(request);
}