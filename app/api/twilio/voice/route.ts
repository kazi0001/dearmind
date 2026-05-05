import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: Request) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id");

    const twiml = new VoiceResponse();

    if (!sessionId) {
        twiml.say(
            { voice: "alice", language: "en-US" },
            "We are sorry. This DearMind call could not be started because the session was missing. Goodbye."
        );

        return xmlResponse(twiml);
    }

    const { data: session, error } = await supabaseAdmin
        .from("voice_call_sessions")
        .select("id, call_week, call_theme")
        .eq("id", sessionId)
        .single();

    if (error || !session) {
        twiml.say(
            { voice: "alice", language: "en-US" },
            "We are sorry. This DearMind call could not be found. Goodbye."
        );

        return xmlResponse(twiml);
    }

    const questions = getQuestionsForWeek(session.call_week || 1);
    const firstQuestion = questions[0];

    twiml.say(
        { voice: "alice", language: "en-US" },
        "Hello. This is DearMind. We help families preserve memories through gentle conversations and monthly letters."
    );

    twiml.pause({ length: 1 });

    twiml.say(
        { voice: "alice", language: "en-US" },
        "This call may be transcribed and summarized so we can prepare your monthly memory letter. Please do not share medical, financial, legal, or highly private information."
    );

    twiml.pause({ length: 1 });

    twiml.say(
        { voice: "alice", language: "en-US" },
        "You can answer each question naturally after the tone. If you do not want to answer a question, you can simply say skip."
    );

    twiml.pause({ length: 1 });

    const actionUrl = buildGuidedResponseUrl({
        requestUrl: request.url,
        sessionId,
        questionIndex: 0,
    });

    const gather = twiml.gather({
        input: ["speech"],
        action: actionUrl,
        method: "POST",
        speechTimeout: "auto",
        timeout: 8,
        language: "en-US",
    });

    gather.say(
        { voice: "alice", language: "en-US" },
        firstQuestion
    );

    twiml.say(
        { voice: "alice", language: "en-US" },
        "I did not hear a response. We will try again another time. Goodbye."
    );

    return xmlResponse(twiml);
}

function buildGuidedResponseUrl({
    requestUrl,
    sessionId,
    questionIndex,
}: {
    requestUrl: string;
    sessionId: string;
    questionIndex: number;
}) {
    const currentUrl = new URL(requestUrl);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    const actionUrl = new URL("/api/twilio/guided-response", baseUrl);
    actionUrl.searchParams.set("session_id", sessionId);
    actionUrl.searchParams.set("question_index", String(questionIndex));

    return actionUrl.toString();
}

function getQuestionsForWeek(callWeek: number) {
    if (callWeek === 1) {
        return [
            "How has your week been so far? Please tell me about one small moment from this week that you would like remembered.",
            "Did you cook, watch, read, visit, or do anything this week that made the day feel meaningful?",
            "Was there anyone in the family you thought about, spoke with, or wished to hear from this week?",
        ];
    }

    if (callWeek === 2) {
        return [
            "Who in your family has been on your mind recently, and what made you think of them?",
            "Is there a family story, funny moment, or lesson you would like your children or grandchildren to remember?",
            "Is there a message you would like to share with someone in the family this month?",
        ];
    }

    if (callWeek === 3) {
        return [
            "Please tell me about a place from your younger days that still feels important to you.",
            "What is one memory from childhood, school, work, marriage, or early family life that you would like preserved?",
            "When you think back on that time, what feeling or lesson stands out most?",
        ];
    }

    if (callWeek === 4) {
        return [
            "Thinking about this month, what would you most like your monthly letter to remember?",
            "Is there a specific family memory, daily routine, recipe, place, or person that should be included in this month’s letter?",
            "Is there anything you are looking forward to next month?",
        ];
    }

    return [
        "How has your week been so far? Please tell me about one small moment you would like remembered.",
        "Is there a family memory or daily-life detail you would like preserved?",
        "Is there anything you would like your family to know this month?",
    ];
}

function xmlResponse(twiml: any) {
    return new Response(twiml.toString(), {
        status: 200,
        headers: {
            "Content-Type": "text/xml",
        },
    });
}