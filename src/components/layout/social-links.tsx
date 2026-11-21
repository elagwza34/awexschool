import { MessageCircle, ArrowUpLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { socialChannels, type SocialLinksConfig } from "@/features/auth/social-links";

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
        const Icon = id === "whatsapp" ? MessageCircle : ArrowUpLeft;
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
