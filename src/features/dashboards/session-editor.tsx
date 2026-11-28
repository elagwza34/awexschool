"use client";

import { useActionState, useState } from "react";
import { AuthSubmit } from "@/features/auth/form-controls";
import { manageClassSession } from "./session-admin-actions";

export type GroupOption = { id: string; name: string; teacherId: string; teacherName: string };
export type EditableSession = { id: string; title: string; groupId: string; starts: string; duration: number };

export function SessionEditor({ groups, item }: { groups: GroupOption[]; item?: EditableSession }) {
  const [notice, action] = useActionState(manageClassSession.bind(null, item?.id ?? null), "");
  const [groupId, setGroupId] = useState(item?.groupId ?? groups[0]?.id ?? "");
  const group = groups.find(({ id }) => id === groupId);

  return (
    <form action={action} className="soft-card grid gap-3 p-4 sm:grid-cols-2">
      <label>المجموعة
        <select className="field" name="group" value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={!!item} required>
          {groups.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      {item && <input type="hidden" name="group" value={groupId} />}
      <label>المدرس المعيّن
        <select key={groupId} className="field" name="teacher" defaultValue={group?.teacherId ?? ""} required>
          {group && <option value={group.teacherId}>{group.teacherName}</option>}
        </select>
      </label>
      <label>عنوان الحصة<input className="field" name="title" defaultValue={item?.title} minLength={2} maxLength={160} required /></label>
      <label>موعد الحصة (القاهرة)<input className="field" name="starts" type="datetime-local" defaultValue={item?.starts} required /></label>
      <label>المدة بالدقائق<input className="field" name="duration" type="number" min={15} max={480} defaultValue={item?.duration ?? 60} required /></label>
      <div className="flex flex-wrap items-end gap-2">
        <AuthSubmit>{item ? "حفظ التعديل" : "إنشاء الحصة"}</AuthSubmit>
        {item && <button className="field" type="submit" name="operation" value="cancel" formNoValidate>إلغاء الحصة</button>}
      </div>
      {notice && <p role="status" className="sm:col-span-2">{notice}</p>}
    </form>
  );
}
