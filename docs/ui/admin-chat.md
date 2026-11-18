# Administration chat preview

The existing shared chat interface now supports administration conversations, using the same temporary portal state and message validation as the student–teacher chat.

| Route | Audience |
| --- | --- |
| `/admin/chat` | Admin contacts: six teachers, two students, one parent |
| `/teacher/admin-chat` | Preview teacher's conversation with administration |
| `/student/admin-chat` | Preview student's conversation with administration |
| `/parent/admin-chat` | Preview parent's conversation with administration |

Admin can filter contacts by role and search names. Users can initiate messages and reply to admin. Each conversation has a stable user-specific ID. Editable display names do not change membership. The preview send handler checks role membership against fixed fixtures. Existing student–teacher conversations remain separate and retain their course-based contacts.

The shared interface supports mobile contact/conversation switching, keyboard submission, message limits and empty states. Administration threads do not show course links. Roles are selected using the existing preview switcher; only one sample identity per role can be acted as. Other teachers/students remain available as admin contacts.

Messages exist in React state only and disappear on reload or leaving the portal preview. There is no real authentication, persistence, delivery, unread count, push notification or read receipt. No Supabase, database or backend changes were made. Real membership enforcement and delivery require a separately approved backend integration.

Verification: lint, TypeScript validation, production build and all 61 Playwright tests passed. New tests verify bidirectional exchanges for all three recipient roles, contact filters/search, isolation, reload reset, absence of external delivery, responsive layout and automated accessibility at 375px, 768px and 1440px. Screenshots: [admin desktop](previews/admin-administration-chat-1440.png), [parent mobile](previews/parent-administration-chat-375.png).
