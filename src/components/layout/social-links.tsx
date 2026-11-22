import { MessageCircle, ArrowUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { socialChannels, type SocialLinksConfig } from "@/features/auth/social-links";

const FacebookIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.655 9.129 8.54 9.878v-6.988h-2.54V12h2.54v-2.759c0-2.296 1.482-3.769 3.736-3.769 1.092 0 2.238.184 2.238.184v3.608h-1.532c-1.134 0-1.364.604-1.364 1.233v1.78h2.859l-0.413 2.759h-2.446v6.988C20.345 21.129 24 16.991 24 12z" />
  </svg>
);

const InstagramIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="20" height="20" x="2" y="2" fill="none" stroke="currentColor" strokeWidth="2" rx="5" />
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="7" r="1" />
  </svg>
);

const YoutubeIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 15.29l4.37-2.53a1 1 0 011.26 0l4.37 2.53c.73.42 1.08 1.39.73 2.21s-1.39 1.08-2.21.73l-4.37-2.53v-2.08zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TiktokIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14 2h3a5 5 0 0 0 5 5v3a8 8 0 0 1-5-1.75V16a6 6 0 1 1-6-6h1v3h-1a3 3 0 1 0 3 3V2Z" />
  </svg>
);

const platformIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  whatsapp: MessageCircle,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
};

export function SocialLinks({ links, className, inverse = false, showLabels = false }: {
  links: SocialLinksConfig;
  className?: string;
  inverse?: boolean;
  showLabels?: boolean;
}) {
  return (
    <ul aria-label="التواصل الاجتماعي" className={cn("flex flex-wrap items-center gap-2", className)}>
      {socialChannels.map(({ id, label }) => {
        const href = links[id];
        if (!href?.startsWith("https://")) return null;
        const Icon = platformIcons[id] ?? ArrowUpLeft;
        return (
          <li key={id}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                showLabels && "px-4",
                inverse ? "border-white/25 text-white hover:bg-white/15" : "border-primary/20 text-primary hover:bg-accent",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {showLabels && label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
