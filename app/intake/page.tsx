"use client";

import { useState } from "react";
import Link from "next/link";

export default function IntakePage() {
    const [form, setForm] = useState({
        buyer_name: "",
        buyer_email: "",
        buyer_phone: "",
        relationship_to_parent: "",
        parent_name: "",
        parent_phone: "",
        parent_age: "",
        parent_city: "",
        preferred_call_day: "",
        preferred_call_time: "",
        sharing_preference: "family_summary_only",
        notes: "",
    });

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    function updateField(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value } = e.target;
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/intake", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to submit intake form.");
            }

            setSuccessMessage(
                "Thank you. Your DearMind pilot intake has been submitted successfully."
            );

            setForm({
                buyer_name: "",
                buyer_email: "",
                buyer_phone: "",
                relationship_to_parent: "",
                parent_name: "",
                parent_phone: "",
                parent_age: "",
                parent_city: "",
                preferred_call_day: "",
                preferred_call_time: "",
                sharing_preference: "family_summary_only",
                notes: "",
            });
        } catch (error) {
            console.error("DearMind intake error:", error);
            setErrorMessage(
                "Something went wrong while submitting the intake form. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-12 text-slate-900">
            <div className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                    ← Back to home
                </Link>

                <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
                    <div className="mb-8">
                        <p className="text-sm font-medium text-amber-700">
                            DearMind Founding Family Pilot
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            Join the DearMind pilot
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Tell us about you and your parent. We’ll use this information to
                            prepare the first welcome call and monthly memory letter.
                        </p>
                    </div>

                    {successMessage && (
                        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <section>
                            <h2 className="text-lg font-semibold">Your information</h2>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Your name"
                                    name="buyer_name"
                                    value={form.buyer_name}
                                    onChange={updateField}
                                    required
                                />

                                <Field
                                    label="Your email"
                                    name="buyer_email"
                                    type="email"
                                    value={form.buyer_email}
                                    onChange={updateField}
                                    required
                                />

                                <Field
                                    label="Your phone"
                                    name="buyer_phone"
                                    value={form.buyer_phone}
                                    onChange={updateField}
                                />

                                <Field
                                    label="Relationship to parent"
                                    name="relationship_to_parent"
                                    placeholder="Daughter, son, niece, etc."
                                    value={form.relationship_to_parent}
                                    onChange={updateField}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">Parent information</h2>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Parent name"
                                    name="parent_name"
                                    value={form.parent_name}
                                    onChange={updateField}
                                    required
                                />

                                <Field
                                    label="Parent phone"
                                    name="parent_phone"
                                    value={form.parent_phone}
                                    onChange={updateField}
                                    required
                                />

                                <Field
                                    label="Parent age"
                                    name="parent_age"
                                    type="number"
                                    value={form.parent_age}
                                    onChange={updateField}
                                />

                                <Field
                                    label="Parent city"
                                    name="parent_city"
                                    value={form.parent_city}
                                    onChange={updateField}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">Call preferences</h2>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <SelectField
                                    label="Preferred call day"
                                    name="preferred_call_day"
                                    value={form.preferred_call_day}
                                    onChange={updateField}
                                    options={[
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                        "Sunday",
                                    ]}
                                />

                                <Field
                                    label="Preferred call time"
                                    name="preferred_call_time"
                                    placeholder="Example: 6:00 PM"
                                    value={form.preferred_call_time}
                                    onChange={updateField}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">Sharing preference</h2>

                            <div className="mt-4">
                                <SelectField
                                    label="What may be shared with family?"
                                    name="sharing_preference"
                                    value={form.sharing_preference}
                                    onChange={updateField}
                                    options={[
                                        "family_summary_only",
                                        "letter_preview_and_summary",
                                        "full_transcript_after_review",
                                        "do_not_share_without_parent_approval",
                                    ]}
                                />
                            </div>

                            <p className="mt-3 text-xs leading-5 text-slate-500">
                                Parent consent will be confirmed before any regular calls begin.
                                DearMind is for memory and family connection only. It is not a
                                medical, emergency, financial, or legal service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">Helpful notes</h2>

                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={updateField}
                                rows={5}
                                className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                placeholder="Tell us anything helpful: family names, preferred topics, topics to avoid, hobbies, language preference, or important occasions."
                            />
                        </section>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Submitting..." : "Submit pilot intake"}
                        </button>
                    </form>
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

function SelectField({
    label,
    name,
    value,
    onChange,
    options,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => void;
    options: string[];
}) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <select
                name={name}
                value={value}
                onChange={onChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
                <option value="">Select one</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {formatOption(option)}
                    </option>
                ))}
            </select>
        </label>
    );
}

function formatOption(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}