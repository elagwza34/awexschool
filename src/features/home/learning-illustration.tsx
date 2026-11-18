import { ArrowUpLeft, Check, Play, Sparkles } from "lucide-react";

export function LearningIllustration() {
  return (
    <div
      className="relative mx-auto w-full max-w-[510px] pb-5 pt-5 lg:py-7"
      aria-label="رسم توضيحي لبطاقة درس في الرياضيات"
    >
      <div className="relative mx-4  rounded-2xl border border-[#d4dfce] bg-white p-4 shadow-none sm:mx-6 sm:p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold">
            <span className="size-2 rounded-full bg-primary" />
            مساحة الفهم
          </span>
          <span className="text-[10px] text-muted-foreground">
            رياضيات · أولى إعدادي
          </span>
        </div>
        <div className="lesson-paper relative flex h-44 flex-col items-center justify-center overflow-hidden rounded-xl border sm:h-48">
          <span className="absolute start-4 top-4 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold">
            درس توضيحي
          </span>
          <svg
            viewBox="0 0 300 160"
            className="h-40 w-full"
            role="img"
            aria-label="مثلث قائم الزاوية وأطوال أضلاعه"
          >
            <path
              d="M75 135 L75 30 L235 135 Z"
              fill="#deebd9"
              stroke="#42744a"
              strokeWidth="2.5"
            />
            <path
              d="M75 118 H92 V135"
              fill="none"
              stroke="#42744a"
              strokeWidth="2"
            />
            <text x="45" y="87" fill="#325e37" fontSize="19" direction="ltr">
              a
            </text>
            <text x="150" y="157" fill="#325e37" fontSize="19" direction="ltr">
              b
            </text>
            <text x="169" y="65" fill="#b76b37" fontSize="19" direction="ltr">
              c
            </text>
            <path
              d="M253 52 L265 32 M246 43 L262 48"
              stroke="#c18a52"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span
            dir="ltr"
            className="mb-3 font-serif text-2xl tracking-widest text-[#345d3c]"
          >
            a² + b² = c²
          </span>
          <span
            aria-hidden="true"
            className="absolute bottom-4 end-4 flex size-10 items-center justify-center rounded-full bg-primary text-white"
          >
            <Play className="size-4 fill-current" />
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#faeadd] text-[10px] font-bold">
            أ ح
          </span>
          <div>
            <p className="text-sm font-bold">لما تفهم الفكرة.. الحل بيختلف.</p>
            <p className="text-[10px] text-muted-foreground">
              أ. أحمد حسن · نتعلم خطوة بخطوة
            </p>
          </div>
        </div>
      </div>
      <div className="absolute -start-1 top-7 flex  items-center gap-2 rounded-xl border bg-white px-3 py-2.5 shadow-none sm:start-0">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f8edd9] text-[#976020]">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
        <div>
          <p className="text-xs font-bold">فكرة جديدة، كل يوم</p>
          <p className="text-[10px] text-muted-foreground">فضولك أول الطريق</p>
        </div>
      </div>
      <div className="absolute bottom-0 end-0 flex  items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-none">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#e5efdf] text-primary">
          <Check aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold">افهم. طبّق. تقدّم.</p>
          <p className="text-[10px] text-muted-foreground">
            على مهلك، وبطريقتك
          </p>
        </div>
        <ArrowUpLeft aria-hidden="true" className="size-4 text-primary" />
      </div>
    </div>
  );
}
