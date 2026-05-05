"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type Family = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string | null;
    relationship_to_parent: string | null;
    subscription_status: string | null;
    created_at: string;
    parents: Parent[];
};

type CallNote = {
    id: string;
    family_id: string;
    parent_id: string;
    call_date: string;
    call_week: number | null;
    call_theme: string | null;
    raw_notes: string | null;
    ai_summary: string | null;
    memory_highlights: string | null;
    sensitive_flag: boolean;
    reviewed: boolean;
    created_at: string;
};

export default function AdminCallsPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [callNotes, setCallNotes] = useState<CallNote[]>([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");

    const [form, setForm] = useState({
        call_date: new Date().toISOString().slice(0, 10),
        call_week: "1",
        call_theme: "Present life and daily activities",
        raw_notes: "",
        ai_summary: "",
        memory_highlights: "",
        sensitive_flag: false,
        reviewed: false,
    });

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const selectedFamily = useMemo(() => {
        return families.find((family) => family.id === selectedFamilyId);
    }, [families, selectedFamilyId]);

    const selectedParent = useMemo(() => {
        return selectedFamily?.parents?.find(
            (parent) => parent.id === selectedParentId
        );
    }, [selectedFamily, selectedParentId]);

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
            console.error("DearMind load families error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    async function loadCallNotes(parentId: string) {
        if (!parentId) {
            setCallNotes([]);
            return;
        }

        setLoadingNotes(true);
        setErrorMessage("");

        try {
            const response = await fetch(
                `/api/admin/call-notes?parent_id=${parentId}`
            );
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load call notes.");
            }

            setCallNotes(result.call_notes || []);
        } catch (error) {
            console.error("DearMind load call notes error:", error);
            setErrorMessage("Could not load call notes.");
        } finally {
            setLoadingNotes(false);
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    useEffect(() => {
        if (selectedParentId) {
            loadCallNotes(selectedParentId);
        }
    }, [selectedParentId]);

    function updateField(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value, type } = e.target;

        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;

            setForm((current) => ({
                ...current,
                [name]: checked,
            }));

            return;
        }

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleFamilyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const familyId = e.target.value;
        const family = families.find((item) => item.id === familyId);
        const firstParent = family?.parents?.[0];

        setSelectedFamilyId(familyId);
        setSelectedParentId(firstParent?.id || "");
    }

    async function generateSummary() {
        if (!form.raw_notes.trim()) {
            setErrorMessage("Please enter raw call notes before generating a summary.");
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/summarize-call", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    raw_notes: form.raw_notes,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to generate summary.");
            }

            setForm((current) => ({
                ...current,
                ai_summary: result.ai_summary || "",
                memory_highlights: result.memory_highlights || "",
                sensitive_flag: Boolean(result.sensitive_flag),
            }));

            setSuccessMessage(
                result.sensitive_flag
                    ? `Summary generated. Sensitive topic flagged: ${result.sensitive_reason || "Needs review."
                    }`
                    : "Summary and memory highlights generated."
            );
        } catch (error) {
            console.error("DearMind generate summary error:", error);
            setErrorMessage("Could not generate summary from raw notes.");
        } finally {
            setSaving(false);
        }
    }

    async function summarizeExistingCallNote(note: CallNote) {
        if (!note.raw_notes?.trim()) {
            setErrorMessage("This call note does not have raw notes to summarize.");
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const summaryResponse = await fetch("/api/admin/summarize-call", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    raw_notes: note.raw_notes,
                }),
            });

            const summaryResult = await summaryResponse.json();

            if (!summaryResponse.ok || !summaryResult.ok) {
                throw new Error(summaryResult.error || "Failed to generate summary.");
            }

            const updateResponse = await fetch("/api/admin/call-notes", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    call_note_id: note.id,
                    ai_summary: summaryResult.ai_summary || "",
                    memory_highlights: summaryResult.memory_highlights || "",
                    sensitive_flag: Boolean(summaryResult.sensitive_flag),
                    reviewed: false,
                }),
            });

            const updateResult = await updateResponse.json();

            if (!updateResponse.ok || !updateResult.ok) {
                throw new Error(updateResult.error || "Failed to update call note.");
            }

            setSuccessMessage(
                summaryResult.sensitive_flag
                    ? `Summary generated. Sensitive topic flagged: ${summaryResult.sensitive_reason || "Needs review."
                    }`
                    : "Summary and memory highlights generated for the existing call note."
            );

            if (selectedParentId) {
                await loadCallNotes(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind summarize existing call note error:", error);
            setErrorMessage("Could not summarize this existing call note.");
        } finally {
            setSaving(false);
        }
    }

    async function markExistingCallNoteReviewed(note: CallNote) {
        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-notes", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    call_note_id: note.id,
                    reviewed: true,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to mark note reviewed.");
            }

            setSuccessMessage("Call note marked as reviewed.");

            if (selectedParentId) {
                await loadCallNotes(selectedParentId);
            }
        } catch (error) {
            console.error("DearMind mark call note reviewed error:", error);
            setErrorMessage("Could not mark call note as reviewed.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!selectedFamilyId || !selectedParentId) {
            setErrorMessage("Please select a family and parent first.");
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-notes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    family_id: selectedFamilyId,
                    parent_id: selectedParentId,
                    ...form,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to save call note.");
            }

            setSuccessMessage("Call note saved successfully.");

            setForm((current) => ({
                ...current,
                raw_notes: "",
                ai_summary: "",
                memory_highlights: "",
                sensitive_flag: false,
                reviewed: false,
            }));

            await loadCallNotes(selectedParentId);
        } catch (error) {
            console.error("DearMind save call note error:", error);
            setErrorMessage("Could not save call note.");
        } finally {
            setSaving(false);
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
                            Weekly Call Notes
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Add, summarize, and review call notes for each DearMind parent
                            profile.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
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

                        <button
                            onClick={() => {
                                if (selectedParentId) {
                                    loadCallNotes(selectedParentId);
                                }
                            }}
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Refresh notes
                        </button>
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

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Add call note</h2>

                        {loadingFamilies ? (
                            <p className="mt-4 text-sm text-slate-600">Loading families...</p>
                        ) : families.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-600">
                                No families available yet. Submit a test intake first.
                            </p>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                                        onChange={(e) => setSelectedParentId(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        {selectedFamily?.parents?.map((parent) => (
                                            <option key={parent.id} value={parent.id}>
                                                {parent.parent_name} ({parent.parent_phone})
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {selectedParent && (
                                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                        <p>
                                            <span className="font-medium text-slate-800">
                                                Consent:
                                            </span>{" "}
                                            {formatText(selectedParent.consent_status || "pending")}
                                        </p>

                                        <p className="mt-1">
                                            <span className="font-medium text-slate-800">
                                                Preferred call:
                                            </span>{" "}
                                            {selectedParent.preferred_call_day || "Not provided"},{" "}
                                            {selectedParent.preferred_call_time ||
                                                "time not provided"}
                                        </p>
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field
                                        label="Call date"
                                        name="call_date"
                                        type="date"
                                        value={form.call_date}
                                        onChange={updateField}
                                        required
                                    />

                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">
                                            Call week
                                        </span>

                                        <select
                                            name="call_week"
                                            value={form.call_week}
                                            onChange={updateField}
                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                        >
                                            <option value="1">Week 1</option>
                                            <option value="2">Week 2</option>
                                            <option value="3">Week 3</option>
                                            <option value="4">Week 4</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Call theme
                                    </span>

                                    <select
                                        name="call_theme"
                                        value={form.call_theme}
                                        onChange={updateField}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        <option value="Present life and daily activities">
                                            Present life and daily activities
                                        </option>
                                        <option value="Family connection">
                                            Family connection
                                        </option>
                                        <option value="Life memory">Life memory</option>
                                        <option value="Monthly letter preparation">
                                            Monthly letter preparation
                                        </option>
                                    </select>
                                </label>

                                <TextArea
                                    label="Raw call notes"
                                    name="raw_notes"
                                    value={form.raw_notes}
                                    onChange={updateField}
                                    placeholder="Write what the parent shared during the call. Keep notes factual, warm, and non-sensitive."
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={generateSummary}
                                    disabled={saving || !form.raw_notes.trim()}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Generating..." : "Generate summary from raw notes"}
                                </button>

                                <TextArea
                                    label="AI or human summary"
                                    name="ai_summary"
                                    value={form.ai_summary}
                                    onChange={updateField}
                                    placeholder="Short summary of the call. You can generate this from raw notes or write it manually."
                                />

                                <TextArea
                                    label="Memory highlights"
                                    name="memory_highlights"
                                    value={form.memory_highlights}
                                    onChange={updateField}
                                    placeholder="Example: Do not forget: she still remembers the mango tree behind her childhood home."
                                />

                                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                                    <label className="flex items-center gap-3 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            name="sensitive_flag"
                                            checked={form.sensitive_flag}
                                            onChange={updateField}
                                            className="h-4 w-4"
                                        />
                                        Contains sensitive topic, needs extra review
                                    </label>

                                    <label className="flex items-center gap-3 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            name="reviewed"
                                            checked={form.reviewed}
                                            onChange={updateField}
                                            className="h-4 w-4"
                                        />
                                        Reviewed by DearMind team
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Saving..." : "Save call note"}
                                </button>
                            </form>
                        )}
                    </section>

                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Previous call notes</h2>

                        {loadingNotes && (
                            <p className="mt-4 text-sm text-slate-600">Loading notes...</p>
                        )}

                        {!loadingNotes && callNotes.length === 0 && (
                            <p className="mt-4 text-sm text-slate-600">
                                No call notes saved for this parent yet.
                            </p>
                        )}

                        {!loadingNotes && callNotes.length > 0 && (
                            <div className="mt-5 space-y-4">
                                {callNotes.map((note) => (
                                    <article
                                        key={note.id}
                                        className="rounded-2xl border border-slate-100 p-4"
                                    >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {note.call_date} · Week {note.call_week || "N/A"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    {note.call_theme || "No theme"}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {note.sensitive_flag && (
                                                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                                        Sensitive
                                                    </span>
                                                )}

                                                {note.reviewed ? (
                                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                                        Reviewed
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                                        Not reviewed
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {note.raw_notes && (
                                            <div className="mt-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    Raw notes
                                                </p>

                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {note.raw_notes}
                                                </p>
                                            </div>
                                        )}

                                        {note.ai_summary && (
                                            <div className="mt-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    Summary
                                                </p>

                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {note.ai_summary}
                                                </p>
                                            </div>
                                        )}

                                        {note.memory_highlights && (
                                            <div className="mt-4 rounded-2xl bg-[#fffaf5] p-4">
                                                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                                                    Memory highlights
                                                </p>

                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {note.memory_highlights}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-5 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() => summarizeExistingCallNote(note)}
                                                disabled={saving || !note.raw_notes?.trim()}
                                                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Generate summary
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => markExistingCallNoteReviewed(note)}
                                                disabled={saving || note.reviewed}
                                                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {note.reviewed ? "Reviewed" : "Mark reviewed"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

function Field({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder = "",
    required = false,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-slate-700">{label}</span>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
        </label>
    );
}

function TextArea({
    label,
    name,
    value,
    onChange,
    placeholder = "",
    required = false,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => void;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-slate-700">{label}</span>

            <textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
        </label>
    );
}

function formatText(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}