import { PageIntro } from "@/components/shared";
import { getSocialLinks } from "@/features/auth/supabase-server";
import { SocialLinks } from "@/components/layout/social-links";

export const metadata = { title: "????? ????" };

export default async function ContactPage() {
  return <div className="container-shell py-8">
    <PageIntro title="????? ????" description="???? ???????? ????? LiveSchool." />
    <SocialLinks showLabels links={await getSocialLinks()} />
  </div>;
}
