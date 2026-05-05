"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setLoading(true);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Invalid password.");
            }

            router.push("/admin");
            router.refresh();
        } catch (error) {
            console.error("DearMind admin login page error:", error);
            setErrorMessage("Invalid password. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-slate-900">
            <div className="mx-auto max-w-md">
                <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                    ← Back to home
                </Link>

                <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
                    <p className="text-sm font-medium text-amber-700">DearMind Admin</p>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                        Admin login
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Enter the admin password to view submitted pilot families.
                    </p>

                    {errorMessage && (
                        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="mt-6 space-y-5">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">
                                Password
                            </span>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Checking..." : "Log in"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}