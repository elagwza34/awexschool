import Image from "next/image";
import Link from "next/link";
import styles from "../home.module.css";
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Check,
  Compass,
  HeartHandshake,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared";
import {
  StageCard,
  SubjectCard,
} from "@/components/catalog-cards";
import {
  grades as previewGrades,
  stages as previewStages,
  subjects as previewSubjects,
} from "@/features/catalog/mock-data";
import { listEducationHierarchy } from "@/features/catalog/live-catalog";
import { stagePresentation, subjectPresentation } from "@/features/catalog/catalog-presentation";
import { isPreviewFixtureEnvironment } from "@/lib/environment";
import { GradeFinder } from "@/features/home/grade-finder";

export const metadata = { title: "????? ?????????" };

export default async function HomeTwoPage() {
  const hierarchy = await listEducationHierarchy();
  const preview = hierarchy.state === "error" && isPreviewFixtureEnvironment();
  const stages = hierarchy.state === "ready"
    ? hierarchy.data.stages.map(stagePresentation)
    : preview ? previewStages : [];
  const grades = hierarchy.state === "ready"
    ? hierarchy.data.grades.map(({ id, name, stage_id }) => ({ id, name, stageId: stage_id }))
    : preview ? previewGrades : [];
  const subjects = hierarchy.state === "ready"
    ? hierarchy.data.subjects.map(subjectPresentation)
    : preview ? previewSubjects : [];

  return (
    <div id="school-platform" className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroPhoto} aria-hidden="true">
          <Image
            src="/hero-bg.webp"
            alt=""
            fill
            preload
            sizes="(max-width: 767px) max(100vw, 34rem), max(56vw, min(185svh, 132rem))"
          />
        </div>
        <div className={`container-shell ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <h1 id="home-title" className={styles.heroTitle}>
              مش بس تذاكر.
              <br />
              خلّيك <span>فاهمها.</span>
            </h1>
            <p className={styles.heroDescription}>
              رحلة تعلّم فيها كل سؤال مهم، وكل فكرة ليها معنى.
              <br className="hidden sm:block" /> شرح بسيط، مدرسين قريبين منك،
              وخطوات تناسبك.
            </p>
            <div className={styles.heroActions}>
              <Button size="lg" className={styles.goldButton} asChild>
                <Link href="/stages">
                  اكتشف رحلتك التعليمية
                  <ArrowLeft aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={styles.previewButton}
                asChild
              >
                <Link href="/#trial">
                  <Play aria-hidden="true" className="fill-current" />
                  احجز حصة مجانية
                </Link>
              </Button>
            </div>
            <div className={styles.heroBenefits}>
              {[
                "منهج مصري، بروح جديدة",
                "تعلّم في وقتك",
                "من الابتدائي للثانوي",
              ].map((text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-3.5 text-primary" />
                  {text}
                </span>
              ))}
            </div>
          </div>
          <Link href="#find-grade" className={styles.scrollLink}>
            <ArrowDown aria-hidden="true" className="size-4" />
            اختار صفك الدراسي
          </Link>
        </div>
      </section>
      <div id="find-grade" className={`container-shell ${styles.finder}`}>
        <GradeFinder stages={stages} grades={grades} />
        {hierarchy.state === "error" && (
          <p role={preview ? "status" : "alert"} className="mt-3 text-sm">
            {preview ? "بيانات تجريبية للمعاينة فقط." : "تعذّر تحميل المراحل والمواد حاليًا."}
          </p>
        )}
      </div>
      <section className={`container-shell ${styles.section}`}>
        <SectionHeading
          eyebrow="كل مرحلة، بداية"
          title="مكانك هنا.. أيًا كانت خطوتك"
          description="محتوى منظّم يساعدك تبني فهمك، سنة بعد سنة."
          href="/stages"
          linkLabel="كل المراحل"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <StageCard stage={stage} key={stage.id} />
          ))}
        </div>
      </section>
      <section className={styles.subjectBand}>
        <div className={`container-shell ${styles.section}`}>
          <SectionHeading
            eyebrow="وراء كل سؤال، اكتشاف"
            title="عالم من المواد.. اختار فضولك"
            href="/subjects"
            linkLabel="استكشف المواد"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        </div>
      </section>
      <section className={`container-shell ${styles.section}`}>
        <SectionHeading
          eyebrow="خطوتك الجاية"
          title="مقررات تفتح لك باب الفهم"
          description="تصفّح المقررات المنشورة وسجّل طلب الالتحاق."
          href="/courses"
          linkLabel="كل المقررات"
        />
      </section>
      <section className={`container-shell ${styles.section}`}>
        <div className="grid gap-6 rounded-3xl bg-[#dff2eb] p-5 md:grid-cols-[1fr_1.3fr] md:p-8">
          <div>
            <p className="eyebrow">التعلّم مش سباق</p>
            <h2 className="section-title">
              نفهم النهارده.
              <br />
              نثق في نفسنا بكرة.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              مش محتاج تحفظ كل إجابة. محتاج تفهم الفكرة، وتعرف تسأل، وتجرب من
              جديد.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                Icon: Compass,
                title: "طريق واضح",
                text: "وحدات مرتبة، من الأساس للتطبيق.",
              },
              {
                Icon: BookOpen,
                title: "فهم أعمق",
                text: "شرح وأمثلة تقرّب لك كل فكرة.",
              },
              {
                Icon: HeartHandshake,
                title: "تعليم قريب منك",
                text: "مدرسون يشرحون بلغة تفهمها.",
              },
            ].map(({ Icon, title, text }) => (
              <div key={title}>
                <span className="mb-4 flex size-12 items-center justify-center rounded-xl border border-[#d2dec9] bg-white/70">
                  <Icon aria-hidden="true" className="size-6 text-primary" />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={`container-shell ${styles.section}`}>
        <div className={styles.closing}>
          <div>
            <p className="text-xs font-bold text-[#ffcf74]">
              كل رحلة بتبدأ بخطوة
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              جاهز تكتشف طريقة أحلى للتعلّم؟
            </h2>
            <p className="mt-2 text-sm text-[#e0f2eb]">
              اختار مقرر يناسب صفّك وهدفك.
            </p>
          </div>
          <Button size="lg" className={styles.goldButton} asChild>
            <Link href="/courses">
              اختار أول خطوة
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
