type WorkflowStep = {
    title: string;
    description: string;
    status: "done" | "current" | "next" | "blocked";
};

export default function AdminWorkflow({
    steps,
}: {
    steps: WorkflowStep[];
}) {
    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">DearMind MVP workflow</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                    <div
                        key={step.title}
                        className="rounded-2xl border border-slate-100 p-4"
                    >
                        <span className={statusClass(step.status)}>
                            {statusLabel(step.status)}
                        </span>

                        <h3 className="mt-3 text-sm font-semibold text-slate-900">
                            {step.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {step.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function statusLabel(status: WorkflowStep["status"]) {
    if (status === "done") return "Done";
    if (status === "current") return "Current";
    if (status === "blocked") return "Blocked";
    return "Next";
}

function statusClass(status: WorkflowStep["status"]) {
    if (status === "done") {
        return "rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700";
    }

    if (status === "current") {
        return "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700";
    }

    if (status === "blocked") {
        return "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700";
    }

    return "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
}