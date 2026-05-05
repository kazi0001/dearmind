"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import AdminWorkflow from "@/components/AdminWorkflow";

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
    const [updatingParentId, setUpdatingParentId] = useState("");
    const [parentConsentDrafts, setParentConsentDrafts] = useState<
        Record<string, string>
    >({});

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

    async function updateParentConsent(parentId: string, consentStatus: string) {
        if (!parentId || !consentStatus) {
            setErrorMessage("Missing parent or consent status.");
            return;
        }

        setUpdatingParentId(parentId);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/parents", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    parent_id: parentId,
                    consent_status: consentStatus,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to update consent status.");
            }

            await loadFamilies();
        } catch (error) {
            console.error("DearMind consent update error:", error);
            setErrorMessage("Could not update consent status.");
        } finally {
            setUpdatingParentId("");
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                            ← Back to home
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            DearMind Admin
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Manage pilot families, calls, letters, summaries, and mailing workflow.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
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

                <AdminNav active="dashboard" />

                <AdminWorkflow
                    steps={[
                        {
                            title: "1. Intake",
                            description:
                                "Family submits buyer and parent details through the public intake form.",
                            status: families.length > 0 ? "done" : "current",
                        },
                        {
                            title: "2. Consent",
                            description:
                                "Parent consent is reviewed before any regular DearMind calls begin.",
                            status: families.some((family) =>
                                family.parents?.some(
                                    (parent) => parent.consent_status === "consented"
                                )
                            )
                                ? "done"
                                : families.length > 0
                                    ? "current"
                                    : "next",
                        },
                        {
                            title: "3. Call and review",
                            description:
                                "Start a guided call, summarize the call note, and mark it reviewed.",
                            status: families.some((family) =>
                                family.parents?.some(
                                    (parent) => parent.consent_status === "consented"
                                )
                            )
                                ? "current"
                                : "next",
                        },
                        {
                            title: "4. Deliver",
                            description:
                                "Generate letter, print handwritten-style version, and send family summary.",
                            status: "next",
                        },
                    ]}
                />

                <div className="grid gap-4 md:grid-cols-4">
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
                        label="Consented parents"
                        value={families.reduce(
                            (count, family) =>
                                count +
                                (family.parents?.filter(
                                    (parent) => parent.consent_status === "consented"
                                ).length || 0),
                            0
                        )}
                    />

                    <MetricCard
                        label="Parent profiles"
                        value={families.reduce(
                            (count, family) => count + (family.parents?.length || 0),
                            0
                        )}
                    />
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Quick actions</h2>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <QuickAction
                            href="/admin/twilio"
                            title="Start guided call"
                            description="Call a parent using the automated weekly question flow."
                        />

                        <QuickAction
                            href="/admin/calls"
                            title="Review call notes"
                            description="Summarize, review, delete, or manage call notes."
                        />

                        <QuickAction
                            href="/admin/letters"
                            title="Generate monthly letter"
                            description="Use reviewed notes to create a parent-facing letter."
                        />

                        <QuickAction
                            href="/admin/print-letter"
                            title="Print handwritten letter"
                            description="Preview and print the final letter in handwritten style."
                        />

                        <QuickAction
                            href="/admin/family-summary"
                            title="Family summary"
                            description="Generate and send the monthly update to the adult child."
                        />

                        <QuickAction
                            href="/intake"
                            title="Test intake"
                            description="Submit a new test family through the public intake form."
                        />
                    </div>
                </div>

                {loading && (
                    <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
                        Loading submitted families...
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                {!loading && !errorMessage && families.length === 0 && (
                    <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm">
                        No pilot families submitted yet.
                    </div>
                )}

                {!loading && !errorMessage && families.length > 0 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-semibold">Pilot families</h2>

                        {families.map((family) => {
                            const parent = family.parents?.[0];

                            return (
                                <div
                                    key={family.id}
                                    className="rounded-3xl bg-white p-6 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h3 className="text-xl font-semibold">
                                                {family.buyer_name}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-600">
                                                {family.buyer_email}
                                                {family.buyer_phone ? ` · ${family.buyer_phone}` : ""}
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Relationship:{" "}
                                                {family.relationship_to_parent || "Not provided"}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <StatusBadge label={family.subscription_status || "pilot"} />

                                            <StatusBadge
                                                label={
                                                    parent?.consent_status
                                                        ? `Consent: ${formatText(parent.consent_status)}`
                                                        : "Consent: pending"
                                                }
                                            />
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
                                                    `Sharing: ${formatText(
                                                        parent.sharing_preference ||
                                                        "family_summary_only"
                                                    )}`,
                                                ]}
                                            />

                                            <div className="rounded-2xl border border-slate-100 p-4 md:col-span-2">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    Consent workflow
                                                </p>

                                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                                    Regular DearMind calls should only begin after the
                                                    parent has clearly consented.
                                                </p>

                                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                                    <select
                                                        value={
                                                            parentConsentDrafts[parent.id] ||
                                                            parent.consent_status ||
                                                            "pending"
                                                        }
                                                        onChange={(e) =>
                                                            setParentConsentDrafts((current) => ({
                                                                ...current,
                                                                [parent.id]: e.target.value,
                                                            }))
                                                        }
                                                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="consented">Consented</option>
                                                        <option value="declined">Declined</option>
                                                        <option value="paused">Paused</option>
                                                    </select>

                                                    <button
                                                        onClick={() =>
                                                            updateParentConsent(
                                                                parent.id,
                                                                parentConsentDrafts[parent.id] ||
                                                                parent.consent_status ||
                                                                "pending"
                                                            )
                                                        }
                                                        disabled={updatingParentId === parent.id}
                                                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {updatingParentId === parent.id
                                                            ? "Saving..."
                                                            : "Save consent status"}
                                                    </button>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <StatusBadge
                                                        label={`Current consent: ${formatText(
                                                            parent.consent_status || "pending"
                                                        )}`}
                                                    />
                                                </div>
                                            </div>
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

function QuickAction({
    href,
    title,
    description,
}: {
    href: string;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
        >
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </Link>
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

function StatusBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
            {label}
        </span>
    );
}

function formatText(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}