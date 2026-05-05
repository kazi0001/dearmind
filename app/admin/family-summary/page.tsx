"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Parent = {
    id: string;
    parent_name: string;
    parent_phone: string;
};

type Family = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    parents: Parent[];
};

type FamilySummary = {
    id: string;
    family_id: string;
    parent_id: string;
    summary_month: string;
    summary_text: string | null;
    status: string | null;
    created_at: string;
};

export default function FamilySummaryPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [summaries, setSummaries] = useState<FamilySummary[]>([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");
    const [summaryMonth, setSummaryMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );

    const [generatedSummary, setGeneratedSummary] = useState("");
    const [editingSummaryId, setEditingSummaryId] = useState("");
    const [editedSummaryText, setEditedSummaryText] = useState("");
    const [editedStatus, setEditedStatus] = useState("reviewed");

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [loadingSummaries, setLoadingSummaries] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [savingSummary, setSavingSummary] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const selectedFamily = useMemo(() => {
        return families.find((family) => family.id === selectedFamilyId);
    }, [families, selectedFamilyId]);

    async function loadFamilies() {
        setLoadingFamilies(true);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/families");
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load families.");
            }

            const loadedFamilies = result.families || [];
            setFamilies(loadedFamilies);

            if (loadedFamilies.length > 0) {
                const firstFamily = loadedFamilies[0];
                const firstParent = firstFamily.parents?.[0];

                setSelectedFamilyId(firstFamily.id);

                if (firstParent) {
                    setSelectedParentId(firstParent.id);
                }
            }
        } catch (error) {
            console.error("DearMind family summary load families error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    async function loadSummaries(parentId: string) {
        if (!parentId) {
            setSummaries([]);
            return;
        }

        setLoadingSummaries(true);
        setErrorMessage("");

        try {
            const response = await fetch(
                `/api/admin/family-summaries?parent_id=${parentId}`
            );
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load family summaries.");
            }

            setSummaries(result.family_summaries || []);
        } catch (error) {
            console.error("DearMind family summary load error:", error);
            setErrorMessage("Could not load family summaries.");
        } finally {
            setLoadingSummaries(false);
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    useEffect(() => {
        if (selectedParentId) {
            loadSummaries(selectedParentId);
        }
    }, [selectedParentId]);

    function handleFamilyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const familyId = e.target.value;
        const family = families.find((item) => item.id === familyId);
        const firstParent = family?.parents?.[0];

        setSelectedFamilyId(familyId);
        setSelectedParentId(firstParent?.id || "");
        setGeneratedSummary("");
        setEditingSummaryId("");
    }

    async function handleGenerateSummary() {
        if (!selectedFamilyId || !selectedParentId || !summaryMonth) {
            setErrorMessage("Please select a family, parent, and month.");
            return;
        }

        setGenerating(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/family-summaries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    family_id: selectedFamilyId,
                    parent_id: selectedParentId,
                    summary_month: summaryMonth,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to generate family summary.");
            }

            setGeneratedSummary(result.summary_text || "");
            setSuccessMessage(
                `Family summary generated from ${result.call_notes_count} call note(s).`
            );

            await loadSummaries(selectedParentId);
        } catch (error) {
            console.error("DearMind generate family summary error:", error);
            setErrorMessage("Could not generate family summary.");
        } finally {
            setGenerating(false);
        }
    }

    function startEditing(summary: FamilySummary) {
        setEditingSummaryId(summary.id);
        setEditedSummaryText(summary.summary_text || "");
        setEditedStatus(summary.status || "reviewed");
        setSuccessMessage("");
        setErrorMessage("");
    }

    function cancelEditing() {
        setEditingSummaryId("");
        setEditedSummaryText("");
        setEditedStatus("reviewed");
    }

    async function saveSummary(summaryId: string) {
        if (!editedSummaryText.trim()) {
            setErrorMessage("Family summary text cannot be empty.");
            return;
        }

        setSavingSummary(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/family-summaries", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    summary_id: summaryId,
                    summary_text: editedSummaryText,
                    status: editedStatus,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to update family summary.");
            }

            setSuccessMessage("Family summary saved.");
            cancelEditing();

            if (selectedParentId) {
                await loadSummaries(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind save family summary error:", error);
            setErrorMessage("Could not save family summary.");
        } finally {
            setSavingSummary(false);
        }
    }

    async function markReadyToSend(summary: FamilySummary) {
        if (!summary.summary_text?.trim()) {
            setErrorMessage("Cannot mark ready to send without summary text.");
            return;
        }

        setSavingSummary(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/family-summaries", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    summary_id: summary.id,
                    summary_text: summary.summary_text,
                    status: "ready_to_send",
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to mark ready to send.");
            }

            setSuccessMessage("Family summary marked as ready to send.");

            if (selectedParentId) {
                await loadSummaries(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind ready-to-send family summary error:", error);
            setErrorMessage("Could not mark summary as ready to send.");
        } finally {
            setSavingSummary(false);
        }
    }

    async function sendFamilySummary(summary: FamilySummary) {
        if (!summary.summary_text?.trim()) {
            setErrorMessage("Cannot send an empty family summary.");
            return;
        }

        setSavingSummary(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/send-family-summary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    summary_id: summary.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to send family summary.");
            }

            setSuccessMessage(result.message || "Family summary sent by email.");

            if (selectedParentId) {
                await loadSummaries(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind send family summary error:", error);
            setErrorMessage("Could not send family summary email.");
        } finally {
            setSavingSummary(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin"
                            className="text-sm text-slate-600 hover:text-slate-900"
                        >
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Family Monthly Summary
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Generate, edit, approve, and send a respectful monthly update to
                            the family subscriber.
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
                            href="/admin/print-letter"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Print letter
                        </Link>
                    </div>
                </div>
                <AdminNav active="summary" />
                {errorMessage && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        {successMessage}
                    </div>
                )}

                <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Generate summary</h2>

                        {loadingFamilies ? (
                            <p className="mt-4 text-sm text-slate-600">Loading families...</p>
                        ) : families.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-600">
                                No families available yet.
                            </p>
                        ) : (
                            <div className="mt-6 space-y-5">
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Family
                                    </span>

                                    <select
                                        value={selectedFamilyId}
                                        onChange={handleFamilyChange}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        {families.map((family) => (
                                            <option key={family.id} value={family.id}>
                                                {family.buyer_name} ({family.buyer_email})
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Parent
                                    </span>

                                    <select
                                        value={selectedParentId}
                                        onChange={(e) => {
                                            setSelectedParentId(e.target.value);
                                            setGeneratedSummary("");
                                            setEditingSummaryId("");
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        {selectedFamily?.parents?.map((parent) => (
                                            <option key={parent.id} value={parent.id}>
                                                {parent.parent_name} ({parent.parent_phone})
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Summary month
                                    </span>

                                    <input
                                        type="month"
                                        value={summaryMonth}
                                        onChange={(e) => setSummaryMonth(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    />
                                </label>

                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={generating}
                                    className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {generating ? "Generating..." : "Generate family summary"}
                                </button>

                                {generatedSummary && (
                                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                                        <p className="text-sm font-semibold text-slate-800">
                                            Latest generated summary
                                        </p>

                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {generatedSummary}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Summary drafts and review</h2>

                        {loadingSummaries && (
                            <p className="mt-4 text-sm text-slate-600">
                                Loading family summaries...
                            </p>
                        )}

                        {!loadingSummaries && summaries.length === 0 && (
                            <p className="mt-4 text-sm text-slate-600">
                                No family summaries generated for this parent yet.
                            </p>
                        )}

                        {!loadingSummaries && summaries.length > 0 && (
                            <div className="mt-5 space-y-5">
                                {summaries.map((summary) => {
                                    const isEditing = editingSummaryId === summary.id;

                                    return (
                                        <article
                                            key={summary.id}
                                            className="rounded-2xl border border-slate-100 p-4"
                                        >
                                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {summary.summary_month}
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-600">
                                                        Status: {formatText(summary.status || "draft")}
                                                    </p>
                                                </div>

                                                <span
                                                    className={
                                                        summary.status === "sent"
                                                            ? "rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                                                            : summary.status === "ready_to_send"
                                                                ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                                                : "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                                                    }
                                                >
                                                    {summary.status === "sent"
                                                        ? "Sent"
                                                        : summary.status === "ready_to_send"
                                                            ? "Ready to send"
                                                            : "Needs review"}
                                                </span>
                                            </div>

                                            {isEditing ? (
                                                <div className="mt-4 space-y-4">
                                                    <label className="block">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            Family summary text
                                                        </span>

                                                        <textarea
                                                            value={editedSummaryText}
                                                            onChange={(e) =>
                                                                setEditedSummaryText(e.target.value)
                                                            }
                                                            rows={12}
                                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-slate-900"
                                                        />
                                                    </label>

                                                    <label className="block">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            Status
                                                        </span>

                                                        <select
                                                            value={editedStatus}
                                                            onChange={(e) => setEditedStatus(e.target.value)}
                                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="reviewed">Reviewed</option>
                                                            <option value="ready_to_send">Ready to send</option>
                                                            <option value="sent">Sent</option>
                                                        </select>
                                                    </label>

                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => saveSummary(summary.id)}
                                                            disabled={savingSummary}
                                                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {savingSummary ? "Saving..." : "Save summary"}
                                                        </button>

                                                        <button
                                                            onClick={cancelEditing}
                                                            disabled={savingSummary}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {summary.summary_text && (
                                                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                            {summary.summary_text}
                                                        </p>
                                                    )}

                                                    <div className="mt-5 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => startEditing(summary)}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                                                        >
                                                            Edit and review
                                                        </button>

                                                        <button
                                                            onClick={() => markReadyToSend(summary)}
                                                            disabled={savingSummary || summary.status === "sent"}
                                                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Mark ready to send
                                                        </button>

                                                        <button
                                                            onClick={() => sendFamilySummary(summary)}
                                                            disabled={savingSummary || summary.status === "sent"}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {summary.status === "sent" ? "Sent" : "Send email"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

function formatText(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}