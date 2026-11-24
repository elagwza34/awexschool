import assert from "node:assert/strict";
import test from "node:test";

import {
  canWriteDirectChat,
  validateDirectChatMessage,
} from "../../src/features/dashboards/chat-safety.ts";

const accountId = "11111111-1111-4111-8111-111111111111";
const contactId = "22222222-2222-4222-8222-222222222222";
const attachmentKey = `${accountId}/33333333-3333-4333-8333-333333333333`;

test("read-only direct chat cannot initiate a write", () => {
  assert.equal(canWriteDirectChat({
    readOnly: true,
    accountId,
    contactId,
  }), false);
});

test("fixture account and contact identifiers cannot initiate a live write", () => {
  assert.equal(canWriteDirectChat({
    readOnly: false,
    accountId: "youssef",
    contactId,
  }), false);
  assert.equal(canWriteDirectChat({
    readOnly: false,
    accountId,
    contactId: "youssef:ahmed-hassan",
  }), false);
  assert.equal(canWriteDirectChat({
    readOnly: false,
    accountId,
    contactId: "ahmed-hassan",
  }), false);
});

test("real account and contact identifiers permit the live write path", () => {
  assert.equal(canWriteDirectChat({
    readOnly: false,
    accountId,
    contactId,
  }), true);
});

test("server message validation rejects every fixture thread identifier", () => {
  for (const fixtureContact of [
    "youssef:ahmed-hassan",
    "youssef:mariam-adel",
    "salma:ahmed-hassan",
    "preview-admin",
  ]) {
    assert.equal(validateDirectChatMessage({
      role: "student",
      administration: false,
      accountId,
      contactId: fixtureContact,
      body: "fixture message",
      attachment: null,
    }), false);
  }
});

test("server message validation accepts a real text message", () => {
  assert.equal(validateDirectChatMessage({
    role: "student",
    administration: false,
    accountId,
    contactId,
    body: "  lesson question  ",
    attachment: null,
  }), true);
});

test("server message validation requires content and enforces its limit", () => {
  for (const body of ["", "   ", "x".repeat(2001)]) {
    assert.equal(validateDirectChatMessage({
      role: "teacher",
      administration: false,
      accountId,
      contactId,
      body,
      attachment: null,
    }), false);
  }
  assert.equal(validateDirectChatMessage({
    role: "teacher",
    administration: false,
    accountId,
    contactId,
    body: "x".repeat(2000),
    attachment: null,
  }), true);
});

test("server message validation accepts only the authenticated account's UUID attachment path", () => {
  const valid = {
    role: "student",
    administration: true,
    accountId,
    contactId,
    body: "",
    attachment: { key: attachmentKey, name: "notes.pdf" },
  };
  assert.equal(validateDirectChatMessage(valid), true);
  assert.equal(validateDirectChatMessage({
    ...valid,
    accountId: "youssef",
  }), false);
  assert.equal(validateDirectChatMessage({
    ...valid,
    attachment: { ...valid.attachment, key: `youssef/33333333-3333-4333-8333-333333333333` },
  }), false);
  assert.equal(validateDirectChatMessage({
    ...valid,
    attachment: {
      ...valid.attachment,
      key: `44444444-4444-4444-8444-444444444444/33333333-3333-4333-8333-333333333333`,
    },
  }), false);
});

test("server message validation rejects malformed attachment names", () => {
  for (const name of ["", "   ", "x".repeat(256)]) {
    assert.equal(validateDirectChatMessage({
      role: "admin",
      administration: true,
      accountId,
      contactId,
      body: "",
      attachment: { key: attachmentKey, name },
    }), false);
  }
});

test("server message validation rejects malformed attachment objects without throwing", () => {
  for (const attachment of [
    { key: null, name: "notes.pdf" },
    { key: attachmentKey, name: null },
    "not-an-attachment",
  ]) {
    assert.equal(validateDirectChatMessage({
      role: "admin",
      administration: true,
      accountId,
      contactId,
      body: "",
      attachment,
    }), false);
  }
});
