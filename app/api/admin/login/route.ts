export async function POST(request: Request) {
    try {
        const body = await request.json();
        const password = body.password;

        if (!process.env.ADMIN_PASSWORD) {
            return Response.json(
                {
                    ok: false,
                    error: "ADMIN_PASSWORD is not configured.",
                },
                { status: 500 }
            );
        }

        if (password !== process.env.ADMIN_PASSWORD) {
            return Response.json(
                {
                    ok: false,
                    error: "Invalid admin password.",
                },
                { status: 401 }
            );
        }

        const response = Response.json({
            ok: true,
            message: "Admin login successful.",
        });

        response.headers.set(
            "Set-Cookie",
            [
                "dearmind_admin=authorized",
                "Path=/",
                "HttpOnly",
                "SameSite=Lax",
                "Max-Age=86400",
                process.env.NODE_ENV === "production" ? "Secure" : "",
            ]
                .filter(Boolean)
                .join("; ")
        );

        return response;
    } catch (error) {
        console.error("DearMind admin login error:", error);

        return Response.json(
            {
                ok: false,
                error: "Unexpected server error during admin login.",
            },
            { status: 500 }
        );
    }
}