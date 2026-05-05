import twilio from "twilio";

export async function POST(request: Request) {
    const url = new URL(request.url);

    const familyId = url.searchParams.get("family_id") || "";
    const parentId = url.searchParams.get("parent_id") || "";
    const callWeek = url.searchParams.get("call_week") || "1";
    const callTheme =
        url.searchParams.get("call_theme") || "Present life and daily activities";

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    const recordingCallbackUrl = new URL(
        "/api/twilio/recording-status",
        siteUrl
    );
    recordingCallbackUrl.searchParams.set("family_id", familyId);
    recordingCallbackUrl.searchParams.set("parent_id", parentId);
    recordingCallbackUrl.searchParams.set("call_week", callWeek);
    recordingCallbackUrl.searchParams.set("call_theme", callTheme);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    twiml.say(
        {
            voice: "alice",
            language: "en-US",
        },
        "Hello. This is DearMind. We help families preserve memories through gentle conversations and monthly letters."
    );

    twiml.pause({ length: 1 });

    twiml.say(
        {
            voice: "alice",
            language: "en-US",
        },
        "This call may be recorded so we can prepare your monthly memory letter. Please do not share medical, financial, legal, or highly private information."
    );

    twiml.pause({ length: 1 });

    twiml.say(
        {
            voice: "alice",
            language: "en-US",
        },
        "For today's memory prompt, please tell us about one small thing from this week that made you smile, or one family memory you would like preserved."
    );

    twiml.record({
        action: recordingCallbackUrl.toString(),
        method: "POST",
        maxLength: 600,
        timeout: 8,
        playBeep: true,
        trim: "trim-silence",
        recordingStatusCallback: recordingCallbackUrl.toString(),
        recordingStatusCallbackMethod: "POST",
    });

    twiml.say(
        {
            voice: "alice",
            language: "en-US",
        },
        "Thank you for sharing. Your story has been saved for review. Goodbye."
    );

    const response = new Response(twiml.toString(), {
        status: 200,
        headers: {
            "Content-Type": "text/xml",
        },
    });

    return response;
}

export async function GET(request: Request) {
    return POST(request);
}