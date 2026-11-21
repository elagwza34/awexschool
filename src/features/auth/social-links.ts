export const socialChannels = [
  { id: "whatsapp", label: "واتساب", hosts: ["wa.me", "whatsapp.com"] },
  { id: "facebook", label: "فيسبوك", hosts: ["facebook.com", "fb.com"] },
  { id: "instagram", label: "إنستجرام", hosts: ["instagram.com"] },
  { id: "youtube", label: "يوتيوب", hosts: ["youtube.com", "youtu.be"] },
  { id: "tiktok", label: "تيك توك", hosts: ["tiktok.com"] },
] as const;

export type SocialLinksConfig = Partial<Record<(typeof socialChannels)[number]["id"], string>>;

export const defaultSocialLinks: SocialLinksConfig = { whatsapp: "https://wa.me/201033150405" };
