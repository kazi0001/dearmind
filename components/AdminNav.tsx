import Link from "next/link";

type AdminNavProps = {
    active?: string;
};

const navItems = [
    { label: "Dashboard", href: "/admin", key: "dashboard" },
    { label: "Call notes", href: "/admin/calls", key: "calls" },
    { label: "Twilio calls", href: "/admin/twilio", key: "twilio" },
    { label: "Letters", href: "/admin/letters", key: "letters" },
    { label: "Print letter", href: "/admin/print-letter", key: "print" },
    { label: "Family summary", href: "/admin/family-summary", key: "summary" },
];

export default function AdminNav({ active = "dashboard" }: AdminNavProps) {
    return (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
                {navItems.map((item) => {
                    const isActive = item.key === active;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={
                                isActive
                                    ? "rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm"
                                    : "rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                            }
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}