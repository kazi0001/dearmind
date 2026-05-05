"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Parent = {
    id: string;
    parent_name: string;
    parent_phone: string;
    preferred_call_day: string | null;
    preferred_call_time: string | null;
    consent_status: string | null;
};

type Family = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    parents: Parent[];
};

export default function AdminTwilioPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");

    const [callWeek, setCallWeek] = useState("1");
    const [callTheme, setCallTheme] = useState("Present life and daily activities");

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [calling, setCalling] = useState(false);
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
                setSelectedParentId(firstParent?.id || "");
            }
        } catch (error) {
            console.error("DearMind Twilio page load error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    useEffect(() => {
        loadFamilies();
    }, []);

    function handleFamilyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const familyId = e.target.value;
        const family = families.find((item) => item.id === familyId);
        const firstParent = family?.parents?.[0];

        setSelectedFamilyId(familyId);
        setSelectedParentId(firstParent?.id || "");
        setSuccessMessage("");
        setErrorMessage("");
    }

    async function startCall() {
        if (!selectedFamilyId || !selectedParentId || !selectedParent) {
            setErrorMessage("Please select a family and parent.");
            return;
        }

        if (selectedParent.consent_status !== "consented") {
            setErrorMessage(
                "This parent has not consented yet. Update consent status to Consented before starting a DearMind call."
            );
            return;
        }

        if (!selectedParent.parent_phone) {
            setErrorMessage("Selected parent does not have a phone number.");
            return;
        }

        setCalling(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/twilio/call", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    family_id: selectedFamilyId,
                    parent_id: selectedParentId,
                    parent_phone: selectedParent.parent_phone,
                    call_week: callWeek,
                    call_theme: callTheme
                })
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(
                    result.error ||
                    "Failed to start Twilio call. Check Twilio settings and phone number format."
                );
            }

            setSuccessMessage(
                `Call started successfully. Twilio SID: ${result.call_sid}`
            );
        } catch (error: any) {
            console.error("DearMind start Twilio call error:", error);
            setErrorMessage(
                error?.message ||
                "Could not start Twilio call. Check Twilio settings and phone number format."
            );
        } finally {
            setCalling(false);
        }
    }

    const consentStatus = selectedParent?.consent_status || "pending";
    const canStartCall = consentStatus === "consented";

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Twilio Voice Calls
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Start an automated DearMind guided memory call after parent consent
                            has been confirmed.
                        </p>
                    </div>

                    <Link
                        href="/admin/calls"
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                        View call notes
                    </Link>
                </div>

                <AdminNav active="twilio" />

                {errorMessage && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        {successMessage}
                    </div>
                )}

                <section className="rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Start guided memory call</h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        DearMind will call the parent and ask three guided questions based on
                        the selected weekly theme. The responses will be saved as call notes
                        for review.
                    </p>

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
                                        setSuccessMessage("");
                                        setErrorMessage("");
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

                            {selectedParent && (
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                    <div className="flex flex-wrap gap-2">
                                        <StatusBadge label={`Consent: ${formatText(consentStatus)}`} />
                                        <StatusBadge label={`Phone: ${selectedParent.parent_phone}`} />
                                    </div>

                                    <p className="mt-3">
                                        <span className="font-medium text-slate-800">
                                            Preferred time:
                                        </span>{" "}
                                        {selectedParent.preferred_call_day || "Not provided"},{" "}
                                        {selectedParent.preferred_call_time || "time not provided"}
                                    </p>

                                    {!canStartCall && (
                                        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                                            Consent is required before starting a DearMind call. Go to
                                            the admin dashboard and update this parent’s consent status
                                            to Consented.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Call week
                                    </span>
                                    <select
                                        value={callWeek}
                                        onChange={(e) => {
                                            const week = e.target.value;
                                            setCallWeek(week);
                                            setCallTheme(getDefaultThemeForWeek(Number(week)));
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        <option value="1">Week 1</option>
                                        <option value="2">Week 2</option>
                                        <option value="3">Week 3</option>
                                        <option value="4">Week 4</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Call theme
                                    </span>
                                    <select
                                        value={callTheme}
                                        onChange={(e) => setCallTheme(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        <option value="Present life and daily activities">
                                            Present life and daily activities
                                        </option>
                                        <option value="Family connection">Family connection</option>
                                        <option value="Life memory">Life memory</option>
                                        <option value="Monthly letter preparation">
                                            Monthly letter preparation
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <div className="rounded-2xl border border-slate-100 p-4">
                                <p className="text-sm font-semibold text-slate-800">
                                    Guided questions for this call
                                </p>

                                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                                    {getQuestionsForWeek(Number(callWeek)).map((question) => (
                                        <li key={question}>• {question}</li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={startCall}
                                disabled={calling || !canStartCall}
                                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {calling
                                    ? "Starting call..."
                                    : !canStartCall
                                        ? "Consent required before call"
                                        : "Start Twilio call"}
                            </button>

                            <p className="text-xs leading-5 text-slate-500">
                                DearMind calls should only be started after the parent has
                                consented. For trial testing, verify the recipient number in
                                Twilio and make sure the parent expects the call.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function StatusBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {label}
        </span>
    );
}

function formatText(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDefaultThemeForWeek(callWeek: number) {
    if (callWeek === 1) return "Present life and daily activities";
    if (callWeek === 2) return "Family connection";
    if (callWeek === 3) return "Life memory";
    if (callWeek === 4) return "Monthly letter preparation";
    return "Present life and daily activities";
}

function getQuestionsForWeek(callWeek: number) {
    if (callWeek === 1) {
        return [
            "How has your week been so far? Please tell me about one small moment from this week that you would like remembered.",
            "Did you cook, watch, read, visit, or do anything this week that made the day feel meaningful?",
            "Was there anyone in the family you thought about, spoke with, or wished to hear from this week?",
        ];
    }

    if (callWeek === 2) {
        return [
            "Who in your family has been on your mind recently, and what made you think of them?",
            "Is there a family story, funny moment, or lesson you would like your children or grandchildren to remember?",
            "Is there a message you would like to share with someone in the family this month?",
        ];
    }

    if (callWeek === 3) {
        return [
            "Please tell me about a place from your younger days that still feels important to you.",
            "What is one memory from childhood, school, work, marriage, or early family life that you would like preserved?",
            "When you think back on that time, what feeling or lesson stands out most?",
        ];
    }

    if (callWeek === 4) {
        return [
            "Thinking about this month, what would you most like your monthly letter to remember?",
            "Is there a specific family memory, daily routine, recipe, place, or person that should be included in this month’s letter?",
            "Is there anything you are looking forward to next month?",
        ];
    }

    return [
        "How has your week been so far? Please tell me about one small moment you would like remembered.",
        "Is there a family memory or daily-life detail you would like preserved?",
        "Is there anything you would like your family to know this month?",
    ];
}