export function RequestReplies({ replies }: { replies?: string[] }) {
  if (!replies?.length) return null;
  return (
    <div className="mt-3 min-w-0 space-y-2">
      <p className="text-sm font-bold">ردود الفريق</p>
      <ul className="space-y-2">
        {replies.map((text, index) => (
          <li key={index} className="rounded-md bg-secondary p-3 text-sm leading-7 whitespace-pre-wrap break-words">{text}</li>
        ))}
      </ul>
    </div>
  );
}
