import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Check,
  Compass,
  HeartHandshake,
  Play,
  Star,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared";
import {
  StageCard,
  SubjectCard,
} from "@/components/catalog-cards";
import { LiveCatalogCourseCard } from "@/features/catalog/live-catalog-card";
import { listEducationHierarchy, listPublicTeacherCards, listPublishedCourses, teacherPresentation } from "@/features/catalog/live-catalog";
import { stagePresentation, subjectPresentation } from "@/features/catalog/catalog-presentation";
import { GradeFinder } from "@/features/home/grade-finder";
import { ReferenceHome } from "@/features/home/reference-home";
import { TeachersCarousel } from "@/features/home/teachers-carousel";

export default async function HomePage() {
  const [hierarchy, catalog, directory] = await Promise.all([
    listEducationHierarchy(), listPublishedCourses(), listPublicTeacherCards(),
  ]);
  const { stages, grades, subjects } = hierarchy.state === "ready" ? hierarchy.data : { stages: [], grades: [], subjects: [] };
  const courses = catalog.state === "ready" ? catalog.data : [];
  const teachers = directory.state === "ready" ? directory.data.map(teacherPresentation) : [];
  return (
    <>
      <ReferenceHome />
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
              <h2 id="home-title" className={styles.heroTitle}>
                مش بس تذاكر.
                <br />
                خلّيك <span>فاهمها.</span>
              </h2>
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
                  <Link href="/courses">
                    <Play aria-hidden="true" className="fill-current" />
                    استكشف الدروس
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
          <GradeFinder stages={stages} grades={grades.map(({ id, name, stage_id }) => ({ id, name, stageId: stage_id }))} />
          {hierarchy.state === "error" && <p role="alert" className="mt-3 text-sm text-destructive">تعذّر تحميل المراحل والمواد حاليًا.</p>}
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
              <StageCard
                stage={stagePresentation(stage)}
                gradeCount={grades.filter(({ stage_id }) => stage_id === stage.id).length}
                key={stage.id}
              />
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
                <SubjectCard key={subject.id} subject={subjectPresentation(subject)} />
              ))}
            </div>
          </div>
        </section>
        <section className={`container-shell ${styles.section}`}>
          <SectionHeading
            eyebrow="خطوتك الجاية"
            title="مقررات تفتح لك باب الفهم"
            description="تصفّح المقررات المنشورة واختر ما يناسبك."
            href="/courses"
            linkLabel="كل المقررات"
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 3).map((course) => (
              <LiveCatalogCourseCard course={course} key={course.id} />
            ))}
          </div>
          {catalog.state === "error" && <p role="alert" className="mt-3 text-sm text-destructive">تعذّر تحميل المقررات حاليًا.</p>}
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
          <SectionHeading
            eyebrow="الناس اللي هتفهم معاهم"
            title="شرح له روح.. ومدرسون لهم شغف"
            description="تعرّف على المدرسين وطريقة شرحهم وخبراتهم في المواد المختلفة."
            href="/teachers"
            linkLabel="تعرّف على مدرسينا"
          />
          {teachers.length > 0 && <TeachersCarousel teachers={teachers} />}
          {directory.state === "error" && <p role="alert" className="mt-3 text-sm text-destructive">تعذّر تحميل المدرسين حاليًا.</p>}
        </section>

        <section className={`container-shell ${styles.section}`}>
          <SectionHeading
            eyebrow="آراء أولياء الأمور"
            title="ثقة وراحة في متابعة أبنائنا"
            description="أمثلة توضيحية لتجربة أولياء الأمور مع الشرح ومتابعة التقدم."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: "أم محمد",
                role: "ولي أمر - الصف الأول الإعدادي",
                text: "الشرح مبسط ومنظم، وبقى ابني يفهم الدروس بدل ما يحفظها. المتابعة كمان واضحة ومريحة.",
              },
              {
                name: "أبو سارة",
                role: "ولي أمر - الصف الرابع الابتدائي",
                text: "المنصة ساعدت بنتي تراجع دروسها بسهولة وفي أي وقت، ومستواها اتحسن بشكل ملحوظ.",
              },
              {
                name: "أم يوسف",
                role: "ولي أمر - الصف الثاني الثانوي",
                text: "حبيت تنوع المدرسين وطريقة العرض. ولدي بقى أكثر ثقة في حل الأسئلة وفهم الأفكار.",
              },
            ].map((item) => (
              <article key={item.name} className="soft-card flex h-full flex-col p-5">
                <div role="img" className="mb-3 flex items-center gap-1 text-[#d97706]" aria-label="تقييم 5 من 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">“{item.text}”</p>
                <div className="mt-4 border-t pt-4">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`container-shell ${styles.section}`}>
          <SectionHeading
            eyebrow="طلابنا المتفوقون"
            title="قصص نجاح تلهم غيرهم"
            description="أمثلة توضيحية لإنجازات الطلاب."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "مريم أحمد", grade: "الصف الثاني الإعدادي", achievement: "الأولى في الرياضيات", initials: "م أ", tone: "bg-[#f0f4f1] text-[#215d46]" },
              { name: "يوسف خالد", grade: "الصف الثالث الابتدائي", achievement: "تميز في العلوم", initials: "ي خ", tone: "bg-[#f0f3f6] text-[#325e89]" },
              { name: "سارة محمود", grade: "الصف الأول الثانوي", achievement: "تفوق في اللغة الإنجليزية", initials: "س م", tone: "bg-[#f3f1f6] text-[#67528b]" },
              { name: "عمر حسن", grade: "الصف السادس الابتدائي", achievement: "الأول على الصف", initials: "ع ح", tone: "bg-[#f7f3ee] text-[#8b4c28]" },
            ].map((student) => (
              <article key={student.name} className="soft-card flex h-full flex-col items-center p-5 text-center">
                <span className={`mb-3 flex size-16 items-center justify-center rounded-full border-4 border-white text-xl font-bold ring-1 ring-border ${student.tone}`}>
                  {student.initials}
                </span>
                <h3 className="text-base font-semibold">{student.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{student.grade}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#92400e]">
                  <Trophy className="size-3.5" aria-hidden="true" />
                  {student.achievement}
                </div>
              </article>
            ))}
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
                ابدأ بدرس مجاني. الفكرة تستاهل المحاولة.
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
    </>
  );
}
