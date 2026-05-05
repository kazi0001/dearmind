export async function POST(request: Request) {
    const formData = await request.formData();

    return Response.json({
        ok: true,
        call_sid: formData.get("CallSid"),
        call_status: formData.get("CallStatus"),
    });
}

export async function GET(request: Request) {
    return POST(request);
}