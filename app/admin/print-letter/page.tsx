"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

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

export default function PrintLetterPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");
    const [selectedLetterId, setSelectedLetterId] = useState("");

    const [fontChoice, setFontChoice] = useState("Kalam");
    const [paperStyle, setPaperStyle] = useState("warm");
    const [showDate, setShowDate] = useState(true);

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [loadingLetters, setLoadingLetters] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const selectedFamily = useMemo(() => {
        return families.find((family) => family.id === selectedFamilyId);
    }, [families, selectedFamilyId]);

    const selectedParent = useMemo(() => {
        return selectedFamily?.parents?.find(
            (parent) => parent.id === selectedParentId
        );
    }, [selectedFamily, selectedParentId]);

    const selectedLetter = useMemo(() => {
        return letters.find((letter) => letter.id === selectedLetterId);
    }, [letters, selectedLetterId]);

    const letterText = selectedLetter?.final_text || selectedLetter?.draft_text || "";

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
            console.error("DearMind print page family load error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    async function loadLetters(parentId: string) {
        if (!parentId) {
            setLetters([]);
            setSelectedLetterId("");
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

            const loadedLetters = result.letters || [];
            setLetters(loadedLetters);

            if (loadedLetters.length > 0) {
                setSelectedLetterId(loadedLetters[0].id);
            } else {
                setSelectedLetterId("");
            }
        } catch (error) {
            console.error("DearMind print page letters load error:", error);
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
        setSelectedLetterId("");
    }

    function handlePrint() {
        window.print();
    }

    function getPaperClass() {
        if (paperStyle === "white") {
            return "bg-white";
        }

        if (paperStyle === "lined") {
            return "bg-white letter-lined";
        }

        return "bg-[#fffaf0]";
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600&family=Kalam:wght@300;400;700&family=Patrick+Hand&display=swap");

        .letter-lined {
          background-image: linear-gradient(
            to bottom,
            transparent 95%,
            rgba(148, 163, 184, 0.28) 96%
          );
          background-size: 100% 34px;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-letter-sheet {
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0.75in !important;
          }
        }
      `}</style>

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/admin"
                            className="text-sm text-slate-600 hover:text-slate-900"
                        >
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Printable Handwritten Letter
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Preview and print approved DearMind letters in a handwritten-style
                            format.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin/letters"
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                            Letters
                        </Link>

                        <button
                            onClick={handlePrint}
                            disabled={!selectedLetter}
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Print letter
                        </button>
                    </div>
                </div>
                <div className="no-print">
                    <AdminNav active="print" />
                </div>
                {errorMessage && (
                    <div className="no-print mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {errorMessage}
                    </div>
                )}

                <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <section className="no-print rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Letter settings</h2>

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
                                            setSelectedLetterId("");
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
                                        Letter
                                    </span>

                                    <select
                                        value={selectedLetterId}
                                        onChange={(e) => setSelectedLetterId(e.target.value)}
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    >
                                        {loadingLetters && <option>Loading letters...</option>}

                                        {!loadingLetters && letters.length === 0 && (
                                            <option value="">No letters available</option>
                                        )}

                                        {!loadingLetters &&
                                            letters.map((letter) => (
                                                <option key={letter.id} value={letter.id}>
                                                    {letter.letter_month} ·{" "}
                                                    {formatText(letter.status || "draft")}
                                                    {letter.human_reviewed ? " · reviewed" : ""}
                                                </option>
                                            ))}
                                    </select>
                                </label>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">
                                            Handwriting style
                                        </span>

                                        <select
                                            value={fontChoice}
                                            onChange={(e) => setFontChoice(e.target.value)}
                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                        >
                                            <option value="Kalam">Kalam, readable</option>
                                            <option value="Patrick Hand">Patrick Hand, casual</option>
                                            <option value="Caveat">Caveat, expressive</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">
                                            Paper style
                                        </span>

                                        <select
                                            value={paperStyle}
                                            onChange={(e) => setPaperStyle(e.target.value)}
                                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                        >
                                            <option value="warm">Warm ivory</option>
                                            <option value="white">Clean white</option>
                                            <option value="lined">Subtle lined paper</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={showDate}
                                        onChange={(e) => setShowDate(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    Show date at top of letter
                                </label>

                                <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                                    For the MVP, print on good-quality ivory paper and mail it in
                                    a simple envelope. Later, this can connect to Handwrytten,
                                    Simply Noted, or another robotic handwriting service.
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="print-area">
                        {selectedLetter ? (
                            <div
                                className={`print-letter-sheet min-h-[900px] rounded-3xl border border-amber-100 ${getPaperClass()} p-10 shadow-sm`}
                            >
                                {showDate && (
                                    <p
                                        className="mb-8 text-right text-xl text-slate-700"
                                        style={{ fontFamily: fontChoice }}
                                    >
                                        {formatMonthForLetter(selectedLetter.letter_month)}
                                    </p>
                                )}

                                <div
                                    className="whitespace-pre-wrap text-[24px] leading-[2.05] text-slate-800"
                                    style={{ fontFamily: fontChoice }}
                                >
                                    {letterText}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl bg-white p-8 text-sm text-slate-600 shadow-sm">
                                Select a letter to preview and print.
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

function formatMonthForLetter(value: string) {
    if (!value) {
        return "";
    }

    const date = new Date(`${value}-01T12:00:00`);

    return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}