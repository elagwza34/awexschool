# مراجعة الأمن - نظام الدردشة (P0)

## نظرة عامة
تاريخ المراجعة: 23 نوفمبر 2026 | النظام: Liveschool Chat System | المخاطر: عالية (P0)

## الثغرات الأمنية المؤكدة

### S-01: Broken Access Level - قراءة الرسائل بدون التحقق من المشاركة
**المكان:** supabase/migrations/20261123130000_restore_direct_chat.sql السطر 11-12
**الجدول:** public.chat_messages
**الخلل:** política القراءة تتحقق فقط من وجود الـ thread دون التحقق من مشاركة المستخدم في chat_participants.
**النتيجة:** أي مستخدم مصادق يمكنه قراءة أي رسالة في أي محادثة.

### S-02: Broken Access Level - إرسال رسائل إلى أي محادثة
**المكان:** supabase/migrations/20261123130000_restore_direct_chat.sql السطر 13-19
**الجدول:** public.chat_messages
**الخلل:** política الإرسال تتحقق من أن sender_id يطابق المستخدم الحالي وأن الـ thread موجود دون التحقق من مشاركة المرسل في المحادثة.
**النتيجة:** أي مستخدم مصادق يمكنه إرسال رسالة إلى أي محادثة موجودة.

### S-03: استبعاد المحادثات المباشرة من سياسة قراءة chat_threads (مصحفح)
**المكان:** supabase/migrations/20261123130000_restore_direct_chat.sql السطر 6-10
**الخلل:** السياسة مقيدة فقط للمحادثات الجماعية (group_id is not null). المحادثات المباشرة (group_id is null) مستثناة.
**الملاحظة:** ليست ثغرة مباشرة مؤكدة (deny by default) لكنها خطر مستقبلي إذا تمت إضافة سياسة أخرى دون التحقق من chat_participants.

### S-04:自我 التسجيل في أي خيط عبر chat_participants INSERT (جديد)
**المكان:** supabase/migrations/20261123123000_add_chat_thread_insert_policies.sql السطر 11-15
**الجدول:** public.chat_participants
**الخلل:** política الإدراج تتحقق فقط من user_id = auth.uid() دون التحقق من أن الخيط يخص المستخدم أو يسمح له بالانضمام.
**النتيجة:** أي مستخدم مصادق يمكنه自我 التسجيل في أي محادثة والوصول لقراءة وإرسال رسائلها.

## الوظائف RPC المدققة
| الوظيفة | النوع | حالة التفويض | الملاحظات |
|:---------|:------|:-------------|:----------|
| read_direct_chat | SECURITY DEFINER | آمن | يتحقق من جهة الاتصال عبر direct_chat_contacts |
| send_direct_chat | SECURITY DEFINER | آمن | يتحقق من جهة الاتصال عبر direct_chat_contacts |
| direct_chat_contacts | SECURITY DEFINER (stable) | آمن | يعيد فقط الاتصالات المسموحة للدور الحالي |

## الصلاحيات الممنوحة (Grants)
| الجدول/الوظيفة | العملية | دور Supabase |
|:---------------|:--------|:-------------|
| public.chat_messages | SELECT | authenticated |
| public.chat_messages | INSERT (thread_id, sender_id, body) | authenticated |
| public.chat_threads | SELECT | authenticated |
| public.chat_participants | SELECT | authenticated |
| public.chat_participants | INSERT | authenticated (سيتم إلغاؤه في الإصلاح) |
| public.read_direct_chat | EXECUTE | authenticated |
| public.send_direct_chat | EXECUTE | authenticated |

## خطة النشر الآمنة
1. إنشاء ملف مايقريksen جديد (تم إنجازه: 20261123140000_fix_chat_rls_participant_check.sql)
2. اختبار في بيئة معزولة مع Supabase اختبار (معلقة - لا يوجد Docker)
3. تطبيق على الإنتاج بعد نجاح الاختبار

## ملف المايقريksen الجديد
المسار: supabase/migrations/20261123140000_fix_chat_rls_participant_check.sql
يحتوي على:
1. استعادة سياسة قراءة الرسائل مع التحقق من المشاركة
2. استعادة سياسة إرسال الرسائل مع التحقق من المشاركة
3. استعادة سياسة قراءة المحادثات مع التحقق من المشاركة (بما في ذلك المحادثات المباشرة)
4. إلغاء INSERT المباشر على chat_participants لمنع自我 التسجيل

## المخاطر المتبقية
| المخاطر | المستوى | الملاحظات |
|:-------|:--------|:----------|
| RLS غير مختبرة محليا | عالي | لا يمكن اختبار سياسات RLS بدون مثيل اختبار Supabase حقيقي |
| الوظائف RPC تستخدم SECURITY DEFINER | متوسط | يجب مراجعة الكود الداخلي للوظائف بشكل دوري |

## التوقيع
تم المراجعة من قبل: نظام التدقيق التلقائي | التاريخ: 23 نوفمبر 2026 | الحالة: P0 مؤكد - يتطلب إصلاح قبل النشر للإنتاج
