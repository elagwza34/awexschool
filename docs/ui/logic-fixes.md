# Logic review fixes

The five findings in [the review](logic-review.md) are addressed:

1. `/pricing` and `/faq` now render real frontend pages. Pricing uses explicitly illustrative models with no approved prices, payments or subscriptions. FAQ content describes the actual preview boundaries. The existing header/footer links remain valid.
2. Teacher profile submission rejects whitespace-only full names/display names, focuses the affected input and preserves the saved profile. The shared save boundary also validates trimmed names and stores normalized values.
3. Teacher schedule displays every created lesson, ordered by date and then start time. Sorting operates on a copy of state. The existing illustrative schedule item remains identified as a demonstration.
4. Changing admin chat role filters clears the selected recipient, draft and feedback, and returns mobile users to the contact list. The active recipient must also match the role filter before the composer is rendered or a message sent.
5. Static homepage star ratings use `role="img"` with an accessible name; decorative stars remain hidden from assistive technology.

Regression coverage in `tests/logic-fixes.spec.ts` includes both invalid teacher name fields, role-filter draft isolation, four lessons created out of chronological order, keyboard FAQ use, pricing preview semantics and rating accessibility. Existing public-route, dialog focus, broken-link and WCAG tests are retained.

No Supabase, backend, authentication, actual messaging, payments or production resources were changed. The previously removed dashboard sections remain removed.

Verification: production build, TypeScript validation and all **77 Playwright tests passed**, including the five new regression scenarios and the previously failing public-route, pricing-dialog, WCAG and broken-link checks. Lint has zero errors and one existing warning about the brand image using `<img>` rather than Next Image; that unrelated image implementation was preserved. New page screenshots cover 375px and 1440px: [pricing mobile](previews/fixed-pricing-375.png), [FAQ desktop](previews/fixed-faq-1440.png).
