import {StudentHeading} from "@/features/dashboards/student-heading";
import {SessionRecords} from "@/features/sessions/views";
export default function AttendancePage(){return <div className="space-y-4"><StudentHeading title="الحضور والغياب" description="حضورك ومواعيد حصص مجموعاتك في المعاينة. الحصة غير المسجل حضورها لا تُحسب غيابًا."/><SessionRecords role="student"/></div>;}
