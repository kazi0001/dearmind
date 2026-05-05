export async function GET() {
    return Response.json({
        ok: true,
        app: "DearMind",
        message: "DearMind MVP API is running",
        timestamp: new Date().toISOString(),
    });
}