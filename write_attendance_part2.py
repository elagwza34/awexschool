path = r'd:\Projects-code\liveschool\src\features\dashboards\live-attendance.tsx'
content = '''    } else {
      const links = role === "parent" ? await client.from("guardian_links").select("student_id").eq("guardian_id", account.user.id) : null;
      const studentIds = role === "student" ? [account.user.id] : links?.data?.map(({ student_id }) => student_id) ?? [];
      const result = studentIds.length ? await client.from("session_attendance")
        .select("session_id,student_id,status,class_sessions(title,starts_at),profiles(display_name)")
        .in("student_id", studentIds).order("marked_at", { ascending: false }).limit(50) : null;
      body = links?.error || result?.error ? <p role="alert" className="soft-card p-4">تعذّر تحميل الحضور.</p> : result?.data?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {result.data.map((item) => {
            const session = item.class_sessions as unknown as { title: string; starts_at: string } | null;
            const profile = item.profiles as unknown as { display_name: string } | null;
            return <li key={`${item.session_id}-${item.student_id}`} className="soft-card p-4">
              <h2 className="font-bold">{session?.title}</h2>
              {role === "parent" && <p className="text-sm">{profile?.display_name}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{labelFor(item.status as keyof typeof statuses)}{session && ` · ${date.format(new Date(session.starts_at))}`}</p>
            </li>;
          })}
        </ul>
      ) : <p className="soft-card p-4">مفيش سجلات حضور متاحة حاليًا.</p>;
    }
  }
  return <main id="main-content" className="dashboard-width space-y-4 py-5">
    <h1 className="text-2xl font-bold">الحضور والغياب</h1>{body}
  </main>;
}
'''
with open(path, 'a', encoding='utf-8') as f:
    f.write(content)
print('Part 2 written')