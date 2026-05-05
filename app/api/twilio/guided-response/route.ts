import twilio from "twilio";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VoiceResponse = twilio.twiml.VoiceResponse;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    const url = new URL(request.url);

    const sessionId = url.searchParams.get("session_id");
    const questionIndexRaw = url.searchParams.get("question_index") || "0";
    const questionIndex = Number(questionIndexRaw);

    const twiml = new VoiceResponse();

    if (!sessionId) {
        twiml.say(
            { voice: "alice", language: "en-US" },
            "We are sorry. This DearMind call could not continue because the session was missing. Goodbye."
        );

        return xmlResponse(twiml);
    }

    const formData = await request.formData();
    const speechResult = String(formData.get("SpeechResult") || "").trim();

    const { data: session, error: sessionError } = await supabaseAdmin
        .from("voice_call_sessions")
        .select("id, family_id, parent_id, schedule_id, call_week, call_theme")
        .eq("id", sessionId)
        .single();

    if (sessionError || !session) {
        twiml.say(
            { voice: "alice", language: "en-US" },
            "We are sorry. This DearMind call could not be found. Goodbye."
        );

        return xmlResponse(twiml);
    }

    const questions = getQuestionsForWeek(session.call_week || 1);
    const currentQuestion = questions[questionIndex] || "General memory question";

    await supabaseAdmin.from("voice_call_answers").insert({
        session_id: sessionId,
        question_index: questionIndex,
        question_text: currentQuestion,
        answer_text: speechResult || "[No response captured]",
    });

    const nextQuestionIndex = questionIndex + 1;
    const nextQuestion = questions[nextQuestionIndex];

    if (nextQuestion) {
        twiml.say(
            { voice: "alice", language: "en-US" },
            "Thank you. Here is the next question."
        );

        twiml.pause({ length: 1 });

        const actionUrl = buildGuidedResponseUrl({
            requestUrl: request.url,
            sessionId,
            questionIndex: nextQuestionIndex,
        });

        const gather = twiml.gather({
            input: ["speech"],
            action: actionUrl,
            method: "POST",
            speechTimeout: "auto",
            timeout: 8,
            language: "en-US",
        });

        gather.say({ voice: "alice", language: "en-US" }, nextQuestion);

        twiml.say(
            { voice: "alice", language: "en-US" },
            "I did not hear a response. We will continue another time. Goodbye."
        );

        return xmlResponse(twiml);
    }

    await finalizeCallSession({
        sessionId,
        familyId: session.family_id,
        parentId: session.parent_id,
        scheduleId: session.schedule_id || null,
        callWeek: session.call_week || 1,
        callTheme: session.call_theme || "Automated guided memory call",
    });

    twiml.say(
        { voice: "alice", language: "en-US" },
        "Thank you for sharing these memories. DearMind has saved your responses for review and for your monthly letter. Goodbye."
    );

    return xmlResponse(twiml);
}

async function finalizeCallSession({
    sessionId,
    familyId,
    parentId,
    scheduleId,
    callWeek,
    callTheme,
}: {
    sessionId: string;
    familyId: string;
    parentId: string;
    scheduleId: string | null;
    callWeek: number;
    callTheme: string;
}) {
    const { data: answers, error } = await supabaseAdmin
        .from("voice_call_answers")
        .select("question_index, question_text, answer_text, created_at")
        .eq("session_id", sessionId)
        .order("question_index", { ascending: true });

    if (error) {
        console.error("DearMind could not load guided call answers:", error);
        return;
    }

    const transcript = (answers || [])
        .map((answer) => {
            return [
                `Question ${answer.question_index + 1}: ${answer.question_text}`,
                `Answer: ${answer.answer_text || "[No response captured]"}`,
            ].join("\n");
        })
        .join("\n\n");

    const rawNotes = [
        "Automated DearMind guided call completed.",
        `Voice session ID: ${sessionId}`,
        scheduleId ? `Schedule ID: ${scheduleId}` : "",
        `Call theme: ${callTheme}`,
        "",
        transcript,
    ]
        .filter(Boolean)
        .join("\n");

    const generatedSummary = await generateCallSummary(rawNotes);

    const { data: callNote, error: callNoteError } = await supabaseAdmin
        .from("call_notes")
        .insert({
            family_id: familyId,
            parent_id: parentId,
            call_date: new Date().toISOString().slice(0, 10),
            call_week: callWeek,
            call_theme: callTheme,
            raw_notes: rawNotes,
            ai_summary: generatedSummary.ai_summary,
            memory_highlights: generatedSummary.memory_highlights,
            sensitive_flag: generatedSummary.sensitive_flag,
            reviewed: false,
        })
        .select("id")
        .single();

    if (callNoteError) {
        console.error("DearMind could not create completed call note:", callNoteError);
    }

    await supabaseAdmin
        .from("voice_call_sessions")
        .update({
            status: "completed",
            completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

    if (scheduleId) {
        await supabaseAdmin
            .from("call_schedule")
            .update({
                status: "completed",
                updated_at: new Date().toISOString(),
            })
            .eq("id", scheduleId);
    }

    if (callNote?.id) {
        console.log("DearMind completed call note created:", callNote.id);
    }
}

async function generateCallSummary(rawNotes: string) {
    const fallback = {
        ai_summary:
            "This automated guided call was completed and saved for human review. The parent answered the guided memory questions, and the responses should be reviewed before generating a monthly letter.",
        memory_highlights:
            "Do not forget: Review the completed guided call responses before using them in a letter.",
        sensitive_flag: false,
    };

    if (!process.env.OPENAI_API_KEY) {
        return fallback;
    }

    try {
        const prompt = `
You are helping DearMind summarize a guided family-memory call.

DearMind is a family memory and connection service. It is not a medical, emergency, legal, financial, political, or therapy service.

Your task:
Return ONLY valid JSON with this exact structure:
{
  "ai_summary": "A warm, factual 4-6 sentence summary of the call.",
  "memory_highlights": "3-5 short bullet-style memory highlights, each starting with 'Do not forget:'",
  "sensitive_flag": false,
  "sensitive_reason": "Brief reason, or empty string if none."
}

Rules:
- Use only the information in the raw call notes.
- Do not invent details.
- Avoid medical, financial, legal, political, religious, or highly private details.
- If sensitive content appears, set sensitive_flag to true.
- Keep the tone warm, respectful, and factual.
- Write for internal DearMind review, not directly to the family.

Raw call notes:
${rawNotes}
`;

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: prompt,
            temperature: 0.3,
        });

        const outputText = response.output_text || "";

        let parsed;

        try {
            parsed = JSON.parse(outputText);
        } catch {
            const cleaned = outputText
                .replace(/^```json/i, "")
                .replace(/^```/i, "")
                .replace(/```$/i, "")
                .trim();

            parsed = JSON.parse(cleaned);
        }

        return {
            ai_summary: parsed.ai_summary || fallback.ai_summary,
            memory_highlights:
                parsed.memory_highlights || fallback.memory_highlights,
            sensitive_flag: Boolean(parsed.sensitive_flag),
        };
    } catch (error) {
        console.error("DearMind auto summary generation failed:", error);
        return fallback;
    }
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

export async function GET(request: Request) {
    return POST(request);
}