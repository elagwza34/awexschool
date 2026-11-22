import Link from "next/link";

const links = [
  { id: "accounts", href: "/admin/teachers", label: "الحسابات والملفات" },
  { id: "applications", href: "/admin/teacher-applications", label: "طلبات التقديم" },
  { id: "assignments", href: "/admin/teachers?view=assignments", label: "المقررات والمجموعات" },
  { id: "finance", href: "/admin/finance", label: "المستحقات" },
] as const;

export function AdminTeachersNav({ active }: { active: (typeof links)[number]["id"] }) {
  return (
    <header className="space-y-3">
      <h1 className="text-2xl font-bold sm:text-3xl">المدرسين</h1>
      <nav aria-label="أقسام إدارة المدرسين" className="flex gap-2 overflow-x-auto border-b">
        {links.map(({ id, href, label }) => (
          <Link key={id} href={href} aria-current={active === id ? "page" : undefined}
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-semibold hover:bg-accent aria-[current=page]:border-primary aria-[current=page]:text-primary">
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
