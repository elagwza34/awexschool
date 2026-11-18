import {ManagementHeader} from "@/features/dashboards/management-header";
import {TeamManagement} from "@/features/dashboards/team-management";
export default function AdminTeamPage(){return <><ManagementHeader role="admin" title="فريق الإدارة" description="إضافة أعضاء بأدوار مدير ودعم فني وخدمة عملاء ضمن المعاينة فقط."/><TeamManagement editable/></>;}
