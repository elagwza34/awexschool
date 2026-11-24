import assert from "node:assert/strict";
import test from "node:test";

import {
  canInvokeLiveChatAction,
  validateDirectChatMessage,
} from "../../src/features/dashboards/chat-safety.ts";

test("direct server-action invocation stays unavailable until live chat is integrated", () => {
  const validLiveMessage = validateDirectChatMessage({
    role: "student",
    administration: false,
    accountId: "11111111-1111-4111-8111-111111111111",
    contactId: "22222222-2222-4222-8222-222222222222",
    body: "A valid message",
    attachment: null,
  });
  assert.equal(validLiveMessage, true);
  assert.equal(canInvokeLiveChatAction(), false);
});
