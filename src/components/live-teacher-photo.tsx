import Image from "next/image";

export function LiveTeacherPhoto({ name, path }: { name: string; path: string | null }) {
  if (!path || !/^\/teachers\/[a-z0-9-]+\.webp$/.test(path)) {
    return <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-primary">
      {name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join(" ")}
    </span>;
  }
  return <Image src={path} alt="" width={80} height={80} className="size-20 shrink-0 rounded-full border object-cover" />;
}
