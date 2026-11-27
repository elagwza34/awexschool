import { Button } from "@/components/ui/button";
import { socialChannels, type SocialLinksConfig } from "./social-links";

export function SocialLinksSettings({ action, links, message }: {
  action: (form: FormData) => Promise<void>;
  links: SocialLinksConfig;
  message?: string;
}) {
  return <section id="social-links" className="scroll-mt-24" aria-labelledby="social-title">
    <form action={action} className="soft-card grid gap-4 p-5 sm:p-6">
      <h2 id="social-title" className="text-xl font-bold">روابط التواصل الاجتماعي</h2>
      {message && <p role="status" className="text-sm">
        {message === "saved" ? "تم حفظ الروابط." : message === "invalid" ? "راجع إن كل رابط HTTPS ومن المنصة الصحيحة." : "تعذّر حفظ الروابط."}
      </p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {socialChannels.map(({ id, label }) => (
          <label key={id} className="grid gap-2 text-sm font-semibold">
            {label}
            <input className="field" name={id} type="url" dir="ltr" maxLength={2048} defaultValue={links[id]} />
          </label>
        ))}
      </div>
      <Button className="justify-self-start">حفظ الروابط</Button>
    </form>
  </section>;
}
