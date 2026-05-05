"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

type Letter = {
    id: string;
    family_id: string;
    parent_id: string;
    letter_month: string;
    draft_text: string | null;
    final_text: string | null;
    status: string | null;
    human_reviewed: boolean;
    mailed_date: string | null;
    created_at: string;
};

export default function AdminLettersPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");
    const [letterMonth, setLetterMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );

    const [generatedDraft, setGeneratedDraft] = useState("");
    const [editingLetterId, setEditingLetterId] = useState("");
    const [editedFinalText, setEditedFinalText] = useState("");
    const [editedStatus, setEditedStatus] = useState("reviewed");
    const [editedMailedDate, setEditedMailedDate] = useState("");

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [loadingLetters, setLoadingLetters] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [savingLetter, setSavingLetter] = useState(false);
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
            console.error("DearMind letters load families error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    async function loadLetters(parentId: string) {
        if (!parentId) {
            setLetters([]);
            return;
        }

        setLoadingLetters(true);
        setErrorMessage("");

        try {
            const response = await fetch(`/api/admin/letters?parent_id=${parentId}`);
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load letters.");
            }

            setLetters(result.letters || []);
        } catch (error) {
            console.error("DearMind letters load error:", error);
            setErrorMessage("Could not load letters.");
        } finally {
            setLoadingLetters(false);
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    useEffect(() => {
        if (selectedParentId) {
            loadLetters(selectedParentId);
        }
    }, [selectedParentId]);

    function handleFamilyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const familyId = e.target.value;
        const family = families.find((item) => item.id === familyId);
        const firstParent = family?.parents?.[0];

        setSelectedFamilyId(familyId);
        setSelectedParentId(firstParent?.id || "");
        setGeneratedDraft("");
        setEditingLetterId("");
    }

    async function handleGenerateLetter() {
        if (!selectedFamilyId || !selectedParentId || !letterMonth) {
            setErrorMessage("Please select a family, parent, and month.");
            return;
        }

        setGenerating(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/letters", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    family_id: selectedFamilyId,
                    parent_id: selectedParentId,
                    letter_month: letterMonth,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to generate letter.");
            }

            setGeneratedDraft(result.draft_text || "");
            setSuccessMessage(
                `Letter draft generated from ${result.call_notes_count} call note(s).`
            );

            await loadLetters(selectedParentId);
        } catch (error) {
            console.error("DearMind generate letter error:", error);
            setErrorMessage("Could not generate letter draft.");
        } finally {
            setGenerating(false);
        }
    }

    function startEditing(letter: Letter) {
        setEditingLetterId(letter.id);
        setEditedFinalText(letter.final_text || letter.draft_text || "");
        setEditedStatus(letter.status || "reviewed");
        setEditedMailedDate(letter.mailed_date || "");
        setSuccessMessage("");
        setErrorMessage("");
    }

    function cancelEditing() {
        setEditingLetterId("");
        setEditedFinalText("");
        setEditedStatus("reviewed");
        setEditedMailedDate("");
    }

    async function saveFinalLetter(letterId: string) {
        if (!editedFinalText.trim()) {
            setErrorMessage("Final letter text cannot be empty.");
            return;
        }

        setSavingLetter(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/letters", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    letter_id: letterId,
                    final_text: editedFinalText,
                    status: editedStatus,
                    human_reviewed: true,
                    mailed_date: editedMailedDate || null,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to update letter.");
            }

            setSuccessMessage("Final letter saved and marked as human-reviewed.");
            cancelEditing();

            if (selectedParentId) {
                await loadLetters(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind save final letter error:", error);
            setErrorMessage("Could not save final letter.");
        } finally {
            setSavingLetter(false);
        }
    }

    async function markReadyToMail(letter: Letter) {
        const finalText = letter.final_text || letter.draft_text || "";

        if (!finalText.trim()) {
            setErrorMessage("Cannot mark ready to mail without letter text.");
            return;
        }

        setSavingLetter(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/letters", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    letter_id: letter.id,
                    final_text: finalText,
                    status: "ready_to_mail",
                    human_reviewed: true,
                    mailed_date: null,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to mark ready to mail.");
            }

            setSuccessMessage("Letter marked as ready to mail.");

            if (selectedParentId) {
                await loadLetters(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind ready-to-mail error:", error);
            setErrorMessage("Could not mark letter as ready to mail.");
        } finally {
            setSavingLetter(false);
        }
    }

    async function markMailed(letter: Letter) {
        const today = new Date().toISOString().slice(0, 10);

        setSavingLetter(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/letters", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    letter_id: letter.id,
                    status: "mailed",
                    human_reviewed: true,
                    mailed_date: today,
                    final_text: letter.final_text || letter.draft_text || "",
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to mark mailed.");
            }

            setSuccessMessage("Letter marked as mailed.");

            if (selectedParentId) {
                await loadLetters(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind mark mailed error:", error);
            setErrorMessage("Could not mark letter as mailed.");
        } finally {
            setSavingLetter(false);
        }
    }

    async function deleteLetter(letter: Letter) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this letter draft? This cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        setSavingLetter(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/letters", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    letter_id: letter.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to delete letter.");
            }

            setSuccessMessage("Letter deleted successfully.");

            if (selectedParentId) {
                await loadLetters(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind delete letter error:", error);
            setErrorMessage("Could not delete letter.");
        } finally {
            setSavingLetter(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin"
                            className="text-sm text-slate-600 hover:text-slate-900"
                        >
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Monthly Letters
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Generate, edit, approve, and prepare monthly DearMind letters for
                            mailing.
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
                    </div>
                </div>

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
                        <h2 className="text-xl font-semibold">Generate letter</h2>

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
                                            setGeneratedDraft("");
                                            setEditingLetterId("");
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
                                        Letter month
                                    </span>

                                    <input
                                        type="month"
                                        value={letterMonth}
                                        onChange={(e) => setLetterMonth(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    />
                                </label>

                                <button
                                    onClick={handleGenerateLetter}
                                    disabled={generating}
                                    className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {generating ? "Generating..." : "Generate monthly letter"}
                                </button>

                                {generatedDraft && (
                                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                                        <p className="text-sm font-semibold text-slate-800">
                                            Latest generated draft
                                        </p>

                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {generatedDraft}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Letter drafts and review</h2>

                        {loadingLetters && (
                            <p className="mt-4 text-sm text-slate-600">Loading letters...</p>
                        )}

                        {!loadingLetters && letters.length === 0 && (
                            <p className="mt-4 text-sm text-slate-600">
                                No letters generated for this parent yet.
                            </p>
                        )}

                        {!loadingLetters && letters.length > 0 && (
                            <div className="mt-5 space-y-5">
                                {letters.map((letter) => {
                                    const isEditing = editingLetterId === letter.id;
                                    const displayText =
                                        letter.final_text || letter.draft_text || "";

                                    return (
                                        <article
                                            key={letter.id}
                                            className="rounded-2xl border border-slate-100 p-4"
                                        >
                                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {letter.letter_month}
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-600">
                                                        Status: {formatText(letter.status || "draft")}
                                                    </p>

                                                    {letter.mailed_date && (
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Mailed: {letter.mailed_date}
                                                        </p>
                                                    )}
                                                </div>

                                                {letter.human_reviewed ? (
                                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                                        Human reviewed
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                                        Needs review
                                                    </span>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div className="mt-4 space-y-4">
                                                    <label className="block">
                                                        <span className="text-sm font-medium text-slate-700">
                                                            Final letter text
                                                        </span>

                                                        <textarea
                                                            value={editedFinalText}
                                                            onChange={(e) =>
                                                                setEditedFinalText(e.target.value)
                                                            }
                                                            rows={14}
                                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-slate-900"
                                                        />
                                                    </label>

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <label className="block">
                                                            <span className="text-sm font-medium text-slate-700">
                                                                Status
                                                            </span>

                                                            <select
                                                                value={editedStatus}
                                                                onChange={(e) =>
                                                                    setEditedStatus(e.target.value)
                                                                }
                                                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                                            >
                                                                <option value="draft">Draft</option>
                                                                <option value="reviewed">Reviewed</option>
                                                                <option value="ready_to_mail">
                                                                    Ready to mail
                                                                </option>
                                                                <option value="mailed">Mailed</option>
                                                            </select>
                                                        </label>

                                                        <label className="block">
                                                            <span className="text-sm font-medium text-slate-700">
                                                                Mailed date
                                                            </span>

                                                            <input
                                                                type="date"
                                                                value={editedMailedDate}
                                                                onChange={(e) =>
                                                                    setEditedMailedDate(e.target.value)
                                                                }
                                                                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                                            />
                                                        </label>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => saveFinalLetter(letter.id)}
                                                            disabled={savingLetter}
                                                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {savingLetter ? "Saving..." : "Save final letter"}
                                                        </button>

                                                        <button
                                                            onClick={cancelEditing}
                                                            disabled={savingLetter}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {displayText && (
                                                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                            {displayText}
                                                        </p>
                                                    )}

                                                    <div className="mt-5 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => startEditing(letter)}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                                                        >
                                                            Edit and review
                                                        </button>

                                                        <button
                                                            onClick={() => markReadyToMail(letter)}
                                                            disabled={savingLetter}
                                                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Mark ready to mail
                                                        </button>

                                                        <button
                                                            onClick={() => markMailed(letter)}
                                                            disabled={savingLetter}
                                                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Mark mailed
                                                        </button>

                                                        <button
                                                            onClick={() => deleteLetter(letter)}
                                                            disabled={savingLetter}
                                                            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Delete
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