# Linked student–teacher chat preview

The owner requested chat between a student and their associated teacher. The existing frontend-only scope is retained. `/student/chat` is the seventh horizontal student navigation link, **الشات**; `/teacher/chat` is available as **شات الطلاب** in teacher navigation.

## Membership and behavior

`chat-data.ts` builds one thread per student/teacher pair from the existing sample enrollments and each course's teacher assignment. The sample student can contact Ahmed Hassan, Mariam Adel and Omar Salem, who teach the student's three courses; unrelated teacher Nour Ibrahim is absent. The sample teacher is Ahmed Hassan and sees only the two sample students enrolled in his assigned courses. A thread can cover multiple courses shared by the same pair.

Membership uses fixed IDs/enrollment fixtures, not editable names, grade or specialization fields. The preview send function checks that the selected thread belongs to the active sample role before accepting a message. This limits UI behavior; it is not backend authorization or a security boundary. All fixtures/messages remain client-side demonstration data.

The shared `ChatWorkspace` provides contact search, selected conversation, course context/link, seeded messages, message composer, empty states and local feedback. Enter adds a message, Shift+Enter adds a line, whitespace-only messages are disabled and messages are limited to 2,000 characters. Text is rendered as ordinary React text, not HTML. Timestamps display in Africa/Cairo. Mobile opens the conversation after contact selection and provides a return-to-conversations button; larger screens show contacts and conversation together.

Messages live in `PortalPreviewProvider` React state. Switching between student and teacher previews with portal links/role selection shows the same shared thread. Reloading or leaving the portal layout resets to fixture messages. Separate tabs/browsers/devices are not connected. No automatic teacher reply, online presence, actual delivery/read receipt, push/email notification, attachment or voice/video call is offered.

No backend, Supabase, database, actual authentication, external messaging service or browser persistence is added. The interface explicitly labels the simulation; no message is sent to a real person. Future real chat requires separately approved identities, server-enforced enrollment/teaching scope, data retention and applicable learner-safeguarding policies.

## Verification

ESLint, strict TypeScript, production build and all **42 Playwright scenarios passed**. Checks cover linked contacts, omission of unrelated teachers, two-direction preview messaging, thread isolation, search, whitespace handling, keyboard behavior, local-only effects, reload reset, mobile contact/back navigation and responsive/accessibility review at 375/768/1440px. The chat flow made no POST/external requests or browser-storage writes. All 139 fixture page URLs remain covered by route checks.

Captures: [student chat](previews/student-chat.png), [teacher chat](previews/teacher-chat.png), [mobile contacts](previews/student-chat-contacts-mobile.png), [mobile conversation](previews/student-chat-mobile.png). Real service integration, physical device and human screen-reader checks remain outside scope.
