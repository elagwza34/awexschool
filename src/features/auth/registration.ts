export type Registration = {
  displayName: string;
  email: string;
  password: string;
  kind: "student" | "parent";
  phone: string;
};

const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = (password: string) => password.length >= 12 && Buffer.byteLength(password) <= 72;

export function readRegistration(form: FormData): Registration | null {
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const displayName = field("name");
  const email = field("email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const kind = field("kind");
  const phone = field("phone");
  if (displayName.length < 2 || displayName.length > 100 || !validEmail(email) ||
      !validPassword(password) || password !== String(form.get("confirmPassword") ?? "") ||
      (phone && !/^\+?[\d ()-]{8,25}$/.test(phone)) || (kind !== "student" && kind !== "parent")) return null;
  return { displayName, email, password, kind, phone };
}

export function signupMetadata(registration: Registration) {
  return {
    display_name: registration.displayName,
    account_kind: registration.kind,
    ...(registration.phone && { contact_phone: registration.phone }),
  };
}
