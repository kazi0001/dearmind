"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Parent = {
    id: string;
    parent_name: string;
    parent_phone: string;
    consent_status: string | null;
    preferred_call_day: string | null;
    preferred_call_time: string | null;
};

type Family = {
    id: string;
    buyer_name: string;
    buyer_email: string;
    parents: Parent[];
};

type ScheduledCall = {
    id: string;
    family_id: string;
    parent_id: string;
    scheduled_date: string;
    call_week: number | null;
    call_theme: string | null;
    status: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    families?: {
        buyer_name: string;
        buyer_email: string;
    };
    parents?: {
        parent_name: string;
        parent_phone: string;
        consent_status: string | null;
        preferred_call_day: string | null;
        preferred_call_time: string | null;
    };
};

export default function AdminSchedulePage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);

    const [selectedFamilyId, setSelectedFamilyId] = useState("");
    const [selectedParentId, setSelectedParentId] = useState("");

    const [form, setForm] = useState({
        scheduled_date: new Date().toISOString().slice(0, 10),
        call_week: "1",
        call_theme: "Present life and daily activities",
        notes: "",
    });

    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
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

    const filteredScheduledCalls = useMemo(() => {
        if (statusFilter === "all") {
            return scheduledCalls;
        }

        return scheduledCalls.filter((call) => call.status === statusFilter);
    }, [scheduledCalls, statusFilter]);

    const today = new Date().toISOString().slice(0, 10);

    const todaysCalls = scheduledCalls.filter(
        (call) => call.scheduled_date === today
    );

    const upcomingCalls = scheduledCalls.filter(
        (call) => call.scheduled_date > today && call.status === "scheduled"
    );

    const inProgressCalls = scheduledCalls.filter(
        (call) => call.status === "in_progress"
    );

    const missedCalls = scheduledCalls.filter((call) => call.status === "missed");

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
            console.error("DearMind schedule load families error:", error);
            setErrorMessage("Could not load families.");
        } finally {
            setLoadingFamilies(false);
        }
    }

    async function loadSchedule() {
        setLoadingSchedule(true);
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-schedule");
            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to load schedule.");
            }

            setScheduledCalls(result.scheduled_calls || []);
        } catch (error) {
            console.error("DearMind schedule load error:", error);
            setErrorMessage("Could not load call schedule.");
        } finally {
            setLoadingSchedule(false);
        }
    }

    useEffect(() => {
        loadFamilies();
        loadSchedule();
    }, []);

    function handleFamilyChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const familyId = e.target.value;
        const family = families.find((item) => item.id === familyId);
        const firstParent = family?.parents?.[0];

        setSelectedFamilyId(familyId);
        setSelectedParentId(firstParent?.id || "");
    }

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

    function updateWeek(e: React.ChangeEvent<HTMLSelectElement>) {
        const week = e.target.value;

        setForm((current) => ({
            ...current,
            call_week: week,
            call_theme: getDefaultThemeForWeek(Number(week)),
        }));
    }

    async function createScheduledCall(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!selectedFamilyId || !selectedParentId) {
            setErrorMessage("Please select a family and parent.");
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-schedule", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    family_id: selectedFamilyId,
                    parent_id: selectedParentId,
                    scheduled_date: form.scheduled_date,
                    call_week: form.call_week,
                    call_theme: form.call_theme,
                    notes: form.notes,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to schedule call.");
            }

            setSuccessMessage("Call scheduled successfully.");

            setForm((current) => ({
                ...current,
                notes: "",
            }));

            await loadSchedule();
        } catch (error) {
            console.error("DearMind create schedule error:", error);
            setErrorMessage("Could not schedule call.");
        } finally {
            setSaving(false);
        }
    }

    async function startScheduledCall(call: ScheduledCall) {
        if (!call.family_id || !call.parent_id) {
            setErrorMessage("Missing family or parent for this scheduled call.");
            return;
        }

        if (!call.parents?.parent_phone) {
            setErrorMessage("Selected parent does not have a phone number.");
            return;
        }

        if (call.parents?.consent_status !== "consented") {
            setErrorMessage(
                "This parent has not consented yet. Update consent status to Consented before starting the call."
            );
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/twilio/call", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    schedule_id: call.id,
                    family_id: call.family_id,
                    parent_id: call.parent_id,
                    parent_phone: call.parents.parent_phone,
                    call_week: call.call_week || 1,
                    call_theme:
                        call.call_theme || getDefaultThemeForWeek(call.call_week || 1),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to start scheduled call.");
            }

            setSuccessMessage(
                `Scheduled call started successfully. Twilio SID: ${result.call_sid}`
            );

            await loadSchedule();
        } catch (error: any) {
            console.error("DearMind start scheduled call error:", error);
            setErrorMessage(
                error?.message ||
                "Could not start scheduled call. Check Twilio settings and phone number."
            );
        } finally {
            setSaving(false);
        }
    }

    async function updateScheduledCallStatus(scheduleId: string, status: string) {
        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-schedule", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    schedule_id: scheduleId,
                    status,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to update schedule.");
            }

            setSuccessMessage(`Call marked as ${formatText(status)}.`);
            await loadSchedule();
        } catch (error) {
            console.error("DearMind update schedule status error:", error);
            setErrorMessage("Could not update scheduled call.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteScheduledCall(scheduleId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this scheduled call? This cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        setSaving(true);
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const response = await fetch("/api/admin/call-schedule", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    schedule_id: scheduleId,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Failed to delete scheduled call.");
            }

            setSuccessMessage("Scheduled call deleted successfully.");
            await loadSchedule();
        } catch (error) {
            console.error("DearMind delete schedule error:", error);
            setErrorMessage("Could not delete scheduled call.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#fffaf5] px-6 py-10 text-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <Link
                            href="/admin"
                            className="text-sm text-slate-600 hover:text-slate-900"
                        >
                            ← Back to admin
                        </Link>

                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                            Call Schedule
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Schedule and track DearMind weekly memory calls.
                        </p>
                    </div>

                    <button
                        onClick={loadSchedule}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                    >
                        Refresh schedule
                    </button>
                </div>

                <AdminNav active="schedule" />

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

                <div className="grid gap-4 md:grid-cols-5">
                    <MetricCard label="Today" value={todaysCalls.length} />
                    <MetricCard label="Upcoming" value={upcomingCalls.length} />
                    <MetricCard label="In progress" value={inProgressCalls.length} />
                    <MetricCard
                        label="Scheduled"
                        value={
                            scheduledCalls.filter((call) => call.status === "scheduled")
                                .length
                        }
                    />
                    <MetricCard label="Missed" value={missedCalls.length} />
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold">Schedule a call</h2>

                        {loadingFamilies ? (
                            <p className="mt-4 text-sm text-slate-600">Loading families...</p>
                        ) : families.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-600">
                                No families available yet.
                            </p>
                        ) : (
                            <form onSubmit={createScheduledCall} className="mt-6 space-y-5">
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

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Scheduled date
                                    </span>

                                    <input
                                        type="date"
                                        name="scheduled_date"
                                        value={form.scheduled_date}
                                        onChange={updateField}
                                        required
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    />
                                </label>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-medium text-slate-700">
                                            Call week
                                        </span>

                                        <select
                                            name="call_week"
                                            value={form.call_week}
                                            onChange={updateWeek}
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
                                            Status
                                        </span>

                                        <input
                                            value="scheduled"
                                            readOnly
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                                        />
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
                                        <option value="Family connection">Family connection</option>
                                        <option value="Life memory">Life memory</option>
                                        <option value="Monthly letter preparation">
                                            Monthly letter preparation
                                        </option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-medium text-slate-700">
                                        Notes
                                    </span>

                                    <textarea
                                        name="notes"
                                        value={form.notes}
                                        onChange={updateField}
                                        rows={4}
                                        placeholder="Optional scheduling notes."
                                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? "Scheduling..." : "Schedule call"}
                                </button>
                            </form>
                        )}
                    </section>

                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Scheduled calls</h2>
                                <p className="mt-2 text-sm text-slate-600">
                                    Track weekly call status and start guided calls from the
                                    schedule.
                                </p>
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                            >
                                <option value="all">All statuses</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="in_progress">In progress</option>
                                <option value="completed">Completed</option>
                                <option value="missed">Missed</option>
                                <option value="skipped">Skipped</option>
                            </select>
                        </div>

                        {loadingSchedule && (
                            <p className="mt-5 text-sm text-slate-600">
                                Loading scheduled calls...
                            </p>
                        )}

                        {!loadingSchedule && filteredScheduledCalls.length === 0 && (
                            <p className="mt-5 text-sm text-slate-600">
                                No scheduled calls found.
                            </p>
                        )}

                        {!loadingSchedule && filteredScheduledCalls.length > 0 && (
                            <div className="mt-5 space-y-4">
                                {filteredScheduledCalls.map((call) => (
                                    <article
                                        key={call.id}
                                        className="rounded-2xl border border-slate-100 p-4"
                                    >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {call.scheduled_date} · Week{" "}
                                                    {call.call_week || "N/A"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    {call.call_theme || "No theme"}
                                                </p>

                                                <p className="mt-2 text-sm text-slate-500">
                                                    Parent: {call.parents?.parent_name || "Unknown"} ·{" "}
                                                    {call.parents?.parent_phone || "No phone"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Buyer: {call.families?.buyer_name || "Unknown"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Consent:{" "}
                                                    {formatText(
                                                        call.parents?.consent_status || "pending"
                                                    )}
                                                </p>
                                            </div>

                                            <StatusBadge label={formatText(call.status || "scheduled")} />
                                        </div>

                                        {call.notes && (
                                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                                <p className="text-sm font-medium text-slate-700">
                                                    Notes
                                                </p>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                    {call.notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-5 flex flex-wrap gap-3">
                                            <button
                                                onClick={() => startScheduledCall(call)}
                                                disabled={
                                                    saving ||
                                                    call.status === "completed" ||
                                                    call.status === "missed" ||
                                                    call.status === "skipped" ||
                                                    call.parents?.consent_status !== "consented"
                                                }
                                                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {call.parents?.consent_status !== "consented"
                                                    ? "Consent required"
                                                    : call.status === "in_progress"
                                                        ? "Call in progress"
                                                        : "Start call"}
                                            </button>

                                            <button
                                                onClick={() =>
                                                    updateScheduledCallStatus(call.id, "completed")
                                                }
                                                disabled={saving}
                                                className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-medium text-green-700 shadow-sm hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Mark completed
                                            </button>

                                            <button
                                                onClick={() =>
                                                    updateScheduledCallStatus(call.id, "missed")
                                                }
                                                disabled={saving}
                                                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Mark missed
                                            </button>

                                            <button
                                                onClick={() =>
                                                    updateScheduledCallStatus(call.id, "skipped")
                                                }
                                                disabled={saving}
                                                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Mark skipped
                                            </button>

                                            <button
                                                onClick={() => deleteScheduledCall(call.id)}
                                                disabled={saving}
                                                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Delete
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

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
    );
}

function StatusBadge({ label }: { label: string }) {
    const normalized = label.toLowerCase().replaceAll(" ", "_");

    let className =
        "rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700";

    if (normalized === "completed") {
        className =
            "rounded-full bg-green-50 px-4 py-2 text-xs font-medium text-green-700";
    }

    if (normalized === "in_progress") {
        className =
            "rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700";
    }

    if (normalized === "missed") {
        className =
            "rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-700";
    }

    if (normalized === "skipped") {
        className =
            "rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700";
    }

    return <span className={className}>{label}</span>;
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