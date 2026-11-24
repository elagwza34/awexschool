import { ChatWorkspace, type ChatData, type ChatRole, type ChatContact } from "./chat-workspace";
import { chatThreads, chatMessageFixtures, previewStudentId, previewTeacherId } from "./chat-data";

export async function LiveChat({ role, section, searchParams }: {
  role: ChatRole;
  section: "chat" | "admin-chat";
  searchParams: Promise<{ contact?: string; user?: string }>;
}) {
  const params = await searchParams;
  const contact = params.contact ?? params.user;
  const path = `/${role}/${section}`;
  const accountId = previewStudentId;

  const administration = role === "admin" || section === "admin-chat";

  // بناء قائمة جهات الاتصال من البيانات التجريبية
  const contacts: ChatContact[] = chatThreads
    .filter((thread) => 
      role === "student" ? thread.studentId === previewStudentId : 
      role === "teacher" ? thread.teacherId === previewTeacherId : true
    )
    .map((thread) => ({
      id: thread.id,
      name: role === "student" ? "أ. أحمد حسن" : "يوسف",
      role: role === "student" ? "teacher" as ChatRole : "student" as ChatRole,
      description: role === "student" ? "مدرس الرياضيات" : "طالب",
      course_labels: thread.courseIds.join(", "),
      course_ids: thread.courseIds,
      latest: "مرحباً، كيف يمكنني مساعدتك؟",
      unreadCount: 0,
    }));

  // جلب الرسائل للخيط المحدد أو افتراضي
  const selectedThreadId = contact || contacts[0]?.id || null;
  const messages: ChatData["messages"] = chatMessageFixtures.filter((m) => 
    selectedThreadId ? m.threadId === selectedThreadId : true
  ).map((m) => ({
    id: m.id,
    body: m.text,
    created_at: m.sentAt,
    mine: m.sender === role,
    from_admin: m.sender === "admin",
    attachment: null,
  }));

  const data: ChatData = {
    contacts,
    selectedId: selectedThreadId,
    messages,
  };

  return (
    <main id="main-content" className="dashboard-width space-y-4 py-5">
      <h1 className="text-2xl font-bold">
        {administration ? "شات الإدارة" : role === "teacher" ? "شات الطلاب" : "الشات"}
      </h1>
      <ChatWorkspace role={role} administration={administration} data={data} path={path} accountId={accountId} readOnly />
    </main>
  );
}
