"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    }

    async function startCall() {
        if (!selectedFamilyId || !selectedParentId || !selectedParent) {
            setErrorMessage("Please select a family and parent.");
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
                throw new Error(result.error || "Failed to start Twilio call.");
            }

            setSuccessMessage(`Call started successfully. Twilio SID: ${result.call_sid}`);
        } catch (error) {
            console.error("DearMind start Twilio call error:", error);
            setErrorMessage("Could not start Twilio call. Check Twilio settings and phone number format.");
        } finally {
            setCalling(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Twilio Voice Calls
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Start a DearMind outbound memory call and save the recording callback.
                        </p>
                    </div>

                    <Link
                        href="/admin/calls"
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                        View call notes
                    </Link>
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

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Start memory call</h2>

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
                                        <span className="font-medium text-slate-800">Consent:</span>{" "}
                                        {selectedParent.consent_status || "pending"}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-medium text-slate-800">Preferred time:</span>{" "}
                                        {selectedParent.preferred_call_day || "Not provided"},{" "}
                                        {selectedParent.preferred_call_time || "time not provided"}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-medium text-slate-800">Phone:</span>{" "}
                                        {selectedParent.parent_phone}
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Call week
                                    </span>
                                    <select
                                        value={callWeek}
                                        onChange={(e) => setCallWeek(e.target.value)}
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

                            <button
                                onClick={startCall}
                                disabled={calling}
                                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {calling ? "Starting call..." : "Start Twilio call"}
                            </button>

                            <p className="text-xs leading-5 text-slate-500">
                                For MVP testing, the parent should know in advance that DearMind
                                will call and record their response for letter preparation.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}