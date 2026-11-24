const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles = new Set(["admin", "student", "teacher", "parent"]);

type ChatAttachment = { key: string; name: string } | null;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

export function canWriteDirectChat({
  readOnly,
  accountId,
  contactId,
}: {
  readOnly: boolean;
  accountId: string;
  contactId: string | null;
}) {
  return !readOnly && isUuid(accountId) && isUuid(contactId);
}

export function validateDirectChatMessage({
  role,
  administration,
  accountId,
  contactId,
  body,
  attachment,
}: {
  role: string;
  administration: boolean;
  accountId: string;
  contactId: string;
  body: string;
  attachment: ChatAttachment;
}) {
  const text = typeof body === "string" ? body.trim() : "";
  if (!roles.has(role) || typeof administration !== "boolean") return false;
  if (!isUuid(accountId) || !isUuid(contactId)) return false;
  if ((!text && !attachment) || text.length > 2000) return false;
  if (!attachment) return true;
  if (typeof attachment !== "object" || typeof attachment.key !== "string") return false;
  const [owner, fileId, extra] = attachment.key.split("/");
  const name = typeof attachment.name === "string" ? attachment.name.trim() : "";
  return !extra && isUuid(owner) && isUuid(fileId) && owner.toLowerCase() === accountId.toLowerCase()
    && name.length >= 1 && name.length <= 255;
}
