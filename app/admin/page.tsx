"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Parent = {
    id: string;
    parent_name: string;
    parent_phone: string;
    parent_age: number | null;
    parent_city: string | null;
    preferred_call_day: string | null;
    preferred_call_time: string | null;
    consent_status: string | null;
    sharing_preference: string | null;
    notes: string | null;
    created_at: string;
};

type Family = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string | null;
    relationship_to_parent: string | null;
    subscription_status: string | null;
    notes: string | null;
    created_at: string;
    parents: Parent[];
};

export default function AdminPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    async function loadFamilies() {
        setLoading(true);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/families");
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load families.");
            }

            setFamilies(result.families || []);
        } catch (error) {
            console.error("DearMind admin load error:", error);
            setErrorMessage("Could not load submitted families.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                            ← Back to home
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            DearMind Admin
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            View submitted pilot families and parent profiles.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin/calls"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Call notes
                        </Link>

                        <Link
                            href="/admin/letters"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Letters
                        </Link>

                        <Link
                            href="/admin/twilio"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Twilio calls
                        </Link>

                        <Link
                            href="/admin/print-letter"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Print letter
                        </Link>

                        <Link
                            href="/admin/family-summary"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Family summary
                        </Link>

                        <button
                            onClick={loadFamilies}
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Refresh
                        </button>

                        <button
                            onClick={async () => {
                                await fetch("/api/admin/logout", { method: "POST" });
                                window.location.href = "/admin-login";
                            }}
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
                        >
                            Log out
                        </button>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <MetricCard label="Total families" value={families.length} />

                    <MetricCard
                        label="Pending consent"
                        value={
                            families.filter((family) =>
                                family.parents?.some(
                                    (parent) => parent.consent_status === "pending"
                                )
                            ).length
                        }
                    />

                    <MetricCard
                        label="Pilot subscriptions"
                        value={
                            families.filter(
                                (family) => family.subscription_status === "pilot"
                            ).length
                        }
                    />
                </div>

                {loading && (
                    <div className="mt-8 rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
                        Loading submitted families...
                    </div>
                )}

                {errorMessage && (
                    <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                {!loading && !errorMessage && families.length === 0 && (
                    <div className="mt-8 rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
                        No pilot families submitted yet.
                    </div>
                )}

                {!loading && !errorMessage && families.length > 0 && (
                    <div className="mt-8 space-y-5">
                        {families.map((family) => {
                            const parent = family.parents?.[0];

                            return (
                                <div
                                    key={family.id}
                                    className="rounded-3xl bg-white p-6 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                {family.buyer_name}
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-600">
                                                {family.buyer_email}
                                                {family.buyer_phone ? ` · ${family.buyer_phone}` : ""}
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Relationship:{" "}
                                                {family.relationship_to_parent || "Not provided"}
                                            </p>
                                        </div>

                                        <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
                                            {family.subscription_status || "pilot"}
                                        </div>
                                    </div>

                                    {parent ? (
                                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                                            <InfoBlock
                                                title="Parent"
                                                lines={[
                                                    `Name: ${parent.parent_name}`,
                                                    `Phone: ${parent.parent_phone}`,
                                                    `Age: ${parent.parent_age ?? "Not provided"}`,
                                                    `City: ${parent.parent_city || "Not provided"}`,
                                                ]}
                                            />

                                            <InfoBlock
                                                title="Call preferences"
                                                lines={[
                                                    `Day: ${parent.preferred_call_day || "Not provided"}`,
                                                    `Time: ${parent.preferred_call_time || "Not provided"
                                                    }`,
                                                    `Consent: ${formatText(
                                                        parent.consent_status || "pending"
                                                    )}`,
                                                    `Sharing: ${formatText(
                                                        parent.sharing_preference ||
                                                        "family_summary_only"
                                                    )}`,
                                                ]}
                                            />
                                        </div>
                                    ) : (
                                        <p className="mt-5 text-sm text-red-600">
                                            No parent profile linked to this family.
                                        </p>
                                    )}

                                    {(family.notes || parent?.notes) && (
                                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                            <p className="text-sm font-medium text-slate-700">
                                                Notes
                                            </p>

                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                {parent?.notes || family.notes}
                                            </p>
                                        </div>
                                    )}

                                    <p className="mt-5 text-xs text-slate-400">
                                        Submitted: {new Date(family.created_at).toLocaleString()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
    );
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
    return (
        <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-800">{title}</p>

            <div className="mt-3 space-y-1">
                {lines.map((line) => (
                    <p key={line} className="text-sm text-slate-600">
                        {line}
                    </p>
                ))}
            </div>
        </div>
    );
}

function formatText(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}