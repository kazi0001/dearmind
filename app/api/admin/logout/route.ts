export async function POST() {
    const response = Response.json({
        ok: true,
        message: "Logged out.",
    });

    response.headers.set(
        "Set-Cookie",
        [
            "dearmind_admin=",
            "Path=/",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=0",
            process.env.NODE_ENV === "production" ? "Secure" : "",
        ]
            .filter(Boolean)
            .join("; ")
    );

    return response;
}