import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const adminCookie = request.cookies.get("dearmind_admin")?.value;
    const isAuthorized = adminCookie === "authorized";

    if (!isAuthorized) {
        return NextResponse.redirect(new URL("/admin-login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};