// Authorized Live School landing page markup. Media is served locally.
export const referenceContent = `
<section class="hero" id="home-top">
  <div class="kit-film"><picture><source media="(max-width: 699px)" srcset="/school-home/img/hero-poster-portrait-720.webp"><img src="/school-home/img/hero-poster-1920.webp" srcset="/school-home/img/hero-poster-960.webp 960w, /school-home/img/hero-poster-1920.webp 1920w" sizes="100vw" alt="" fetchpriority="high" decoding="async"></picture><video data-film="now" muted playsinline loop preload="none" aria-hidden="true" data-hd="/school-home/video/hero-1080.mp4" data-sd="/school-home/video/hero-720.mp4" data-portrait="/school-home/video/hero-portrait.mp4"></video></div>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-in">
    <p class="hero-live" data-reveal="fade" data-delay="0.1"><span class="live"><i aria-hidden="true"></i>مباشر</span><span class="hero-from">الشيخ زايد، الجيزة</span></p>
    <h1 data-split="words" data-split-now data-delay="0.3">مدرستك معاك في أي مكان.</h1>
    <p class="sub" data-reveal data-delay="0.75">حصص مباشرة مع مدرسين متخصصين، من الحضانة لحد الثانوية العامة، لأولاد المصريين في مصر وبره. جدول منظم، ومتابعة مستمرة، وتقرير أسبوعي يوصلك.</p>
    <p class="ctas" data-reveal data-delay="0.95"><a class="btn big btn-o" href="#trial" data-magnetic>احجز حصة تجريبية مجانية</a><a class="btn ghost big" href="#onair" data-magnetic>شوف إزاي بتشتغل</a></p>
  </div>
  <div class="clocks"><span class="clocks-l">الساعة دلوقتي</span><ul><li data-clock="Africa/Cairo"><b>--:--</b><span>القاهرة</span></li><li data-clock="Asia/Riyadh"><b>--:--</b><span>الرياض</span></li><li data-clock="Asia/Dubai"><b>--:--</b><span>دبي</span></li></ul></div>
  <a class="cue" href="#onair"><span class="cue-f" aria-hidden="true"><i></i></span>انزل تحت وشوف الحصة بتوصل فين</a>
</section>

<section class="onair" id="onair" aria-label="الحصة بتبدأ في الشيخ زايد…">
  <div class="oa" data-onair>
    <div class="oa-head"><h2>الحصة بتبدأ في الشيخ زايد…</h2><p>وبتوصل لكل بيت فيه ولد أو بنت من مصر. كمّل نزول وشوف الإشارة بتسافر فين.</p></div>
    <div class="oa-stage">
      <svg class="oa-map" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  <g class="grid"><line x1="0" y1="0" x2="0" y2="700"/><line x1="125" y1="0" x2="125" y2="700"/><line x1="250" y1="0" x2="250" y2="700"/><line x1="375" y1="0" x2="375" y2="700"/><line x1="500" y1="0" x2="500" y2="700"/><line x1="625" y1="0" x2="625" y2="700"/><line x1="750" y1="0" x2="750" y2="700"/><line x1="875" y1="0" x2="875" y2="700"/><line x1="1000" y1="0" x2="1000" y2="700"/><line x1="0" y1="0" x2="1000" y2="0"/><line x1="0" y1="117" x2="1000" y2="117"/><line x1="0" y1="234" x2="1000" y2="234"/><line x1="0" y1="351" x2="1000" y2="351"/><line x1="0" y1="468" x2="1000" y2="468"/><line x1="0" y1="585" x2="1000" y2="585"/><line x1="0" y1="702" x2="1000" y2="702"/></g>
  <path class="land" d="M75 160 L125 165 L178 178 L225 163 L257 167 L305 167 L322 135 L338 97 L347 55 L353 32 L400 30 L475 22 L550 18 L585 55 L600 125 L643 175 L663 200 L650 215 L663 235 L688 270 L705 293 L725 293 L740 297 L732 335 L763 345 L810 340 L848 305 L857 293 L860 318 L888 360 L945 388 L932 415 L900 440 L875 478 L838 505 L775 535 L700 570 L650 600 L575 630 L532 633 L520 593 L513 550 L488 500 L463 450 L430 410 L407 350 L382 313 L363 275 L332 245 L324 213 L315 242 L300 256 L290 247 L272 217 L264 201 L280 235 L297 268 L310 295 L330 345 L340 375 L372 400 L225 400 L75 400Z M257 72 L315 60 L297 82 L263 85Z"/>
  <g class="arcs"><path class="arc world" data-world d="M225 199 Q105 -31 165 -40" pathLength="1"/><path class="arc" data-arc="0" d="M225 199 Q421.5 88.96 618 333" pathLength="1"/><circle class="dot" data-dot="0" cx="618" cy="333" r="7"/><path class="arc" data-arc="1" d="M225 199 Q437 80.27999999999999 649 216" pathLength="1"/><circle class="dot" data-dot="1" cx="649" cy="216" r="7"/><path class="arc" data-arc="2" d="M225 199 Q528.5 29.039999999999992 832 320" pathLength="1"/><circle class="dot" data-dot="2" cx="832" cy="320" r="7"/><path class="arc" data-arc="3" d="M225 199 Q327.5 139 430 413" pathLength="1"/><circle class="dot" data-dot="3" cx="430" cy="413" r="7"/><path class="arc" data-arc="4" d="M225 199 Q481.5 55.359999999999985 738 318" pathLength="1"/><circle class="dot" data-dot="4" cx="738" cy="318" r="7"/><path class="arc" data-arc="5" d="M225 199 Q569.5 6.079999999999984 914 360" pathLength="1"/><circle class="dot" data-dot="5" cx="914" cy="360" r="7"/></g>
  <g class="src" transform="translate(225 199)"><circle class="ring r1" r="10"/><circle class="ring r2" r="10"/><circle class="core" r="9"/></g>
</svg>
      <div class="oa-wins" data-wins>
        <figure class="win src" data-src-win data-lon="30.98" data-lat="30.04"><span class="win-pic"><img src="/school-home/img/teacher-800.webp" srcset="/school-home/img/teacher-480.webp 480w, /school-home/img/teacher-800.webp 800w, /school-home/img/teacher-1200.webp 1200w, /school-home/img/teacher-1600.webp 1600w, /school-home/img/teacher-2400.webp 2400w" sizes="180px" width="800" height="450" alt="المدرس" loading="lazy" decoding="async"></span><figcaption><b>الشيخ زايد، الجيزة</b><span class="win-t"><span class="live sm"><i aria-hidden="true"></i>مباشر</span></span></figcaption></figure>
        <figure class="win" data-win="0" data-lon="46.7" data-lat="24.7" data-tz="Asia/Riyadh">
      <span class="win-pic"><img src="/school-home/img/desk-800.webp" srcset="/school-home/img/desk-480.webp 480w, /school-home/img/desk-800.webp 800w, /school-home/img/desk-1200.webp 1200w, /school-home/img/desk-1360.webp 1360w" sizes="180px" width="800" height="1176" alt="الرياض" loading="lazy" decoding="async"></span>
      <figcaption><b>الرياض</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure><figure class="win" data-win="1" data-lon="47.98" data-lat="29.37" data-tz="Asia/Kuwait">
      <span class="win-pic"><img src="/school-home/img/kg-800.webp" srcset="/school-home/img/kg-480.webp 480w, /school-home/img/kg-800.webp 800w, /school-home/img/kg-1200.webp 1200w, /school-home/img/kg-1408.webp 1408w" sizes="180px" width="800" height="1136" alt="الكويت" loading="lazy" decoding="async"></span>
      <figcaption><b>الكويت</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure><figure class="win" data-win="2" data-lon="55.3" data-lat="25.2" data-tz="Asia/Dubai">
      <span class="win-pic"><img src="/school-home/img/teen-800.webp" srcset="/school-home/img/teen-480.webp 480w, /school-home/img/teen-800.webp 800w, /school-home/img/teen-1200.webp 1200w, /school-home/img/teen-1216.webp 1216w" sizes="180px" width="800" height="1316" alt="دبي" loading="lazy" decoding="async"></span>
      <figcaption><b>دبي</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure><figure class="win" data-win="3" data-lon="39.2" data-lat="21.5" data-tz="Asia/Riyadh">
      <span class="win-pic"><img src="/school-home/img/kids-720.webp" srcset="/school-home/img/kids-480.webp 480w, /school-home/img/kids-720.webp 720w" sizes="180px" width="720" height="224" alt="جدة" loading="lazy" decoding="async"></span>
      <figcaption><b>جدة</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure><figure class="win" data-win="4" data-lon="51.53" data-lat="25.29" data-tz="Asia/Qatar">
      <span class="win-pic"><img src="/school-home/img/gulf-800.webp" srcset="/school-home/img/gulf-480.webp 480w, /school-home/img/gulf-800.webp 800w, /school-home/img/gulf-1200.webp 1200w, /school-home/img/gulf-1587.webp 1587w" sizes="180px" width="800" height="436" alt="الدوحة" loading="lazy" decoding="async"></span>
      <figcaption><b>الدوحة</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure><figure class="win" data-win="5" data-lon="58.55" data-lat="23.6" data-tz="Asia/Muscat">
      <span class="win-pic"><img src="/school-home/img/room-302.webp" srcset="/school-home/img/room-302.webp 302w" sizes="180px" width="302" height="298" alt="مسقط" loading="lazy" decoding="async"></span>
      <figcaption><b>مسقط</b><span class="win-t" data-win-time>--:--</span></figcaption>
    </figure>
        <p class="oa-world" data-world-lbl>…وأي مكان في العالم</p>
      </div>
    </div>
    <ol class="oa-chips" aria-hidden="true"><li data-chip="0"><i></i>الرياض</li><li data-chip="1"><i></i>الكويت</li><li data-chip="2"><i></i>دبي</li><li data-chip="3"><i></i>جدة</li><li data-chip="4"><i></i>الدوحة</li><li data-chip="5"><i></i>مسقط</li></ol>
    <div class="oa-end" data-oa-end><h3>حصة واحدة، بيوت كتير.</h3><p>نفس المدرس، نفس الجدول، نفس المتابعة، سواء ولادك في مصر أو في السعودية أو الكويت أو الإمارات أو أي مكان.</p><a class="btn" href="#school-stages">شوف المراحل</a></div>
  </div>
</section>

<section class="stages" id="school-stages" data-hscroll>
  <div class="st-head"><div><h2 data-split>من الحضانة لحد الثانوية العامة</h2><p class="lead" data-reveal>كل مرحلة ليها جدول وطريقة شرح على قد سنها. اسحب وشوف.</p></div><span class="st-bar" aria-hidden="true"><span data-hscroll-bar></span></span><span class="st-swipe" aria-hidden="true">اسحب <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
  <div class="st-track" data-hscroll-track tabindex="0" role="region" aria-label="المراحل الدراسية"><article class="stg" data-stg="0"><a class="stg-link" href="/stages/kindergarten" aria-labelledby="school-card-kindergarten">
      <span class="scr stg-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>KG1 و KG2</b></span><span class="scr-in"><img src="/school-home/img/kg-800.webp" srcset="/school-home/img/kg-480.webp 480w, /school-home/img/kg-800.webp 800w, /school-home/img/kg-1200.webp 1200w, /school-home/img/kg-1408.webp 1408w" sizes="(min-width: 901px) 34vw, 78vw" width="800" height="1136" alt="الحضانة" loading="lazy" decoding="async"></span></span>
      <div class="stg-t"><h3 id="school-card-kindergarten">الحضانة</h3><p>أول خطوة: حروف وأرقام وحكايات، في حصص قصيرة على قد تركيزهم.</p><span class="stg-link-label">عرض السنوات الدراسية <span aria-hidden="true">←</span></span></div>
    </a></article><article class="stg" data-stg="1"><a class="stg-link" href="/stages/primary" aria-labelledby="school-card-primary">
      <span class="scr stg-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>من أولى لسادسة</b></span><span class="scr-in"><img src="/school-home/img/desk-800.webp" srcset="/school-home/img/desk-480.webp 480w, /school-home/img/desk-800.webp 800w, /school-home/img/desk-1200.webp 1200w, /school-home/img/desk-1360.webp 1360w" sizes="(min-width: 901px) 34vw, 78vw" width="800" height="1176" alt="الابتدائي" loading="lazy" decoding="async"></span></span>
      <div class="stg-t"><h3 id="school-card-primary">الابتدائي</h3><p>المواد الأساسية بشرح بسيط، وواجبات بتتتابع، ومراجعة قبل كل امتحان.</p><span class="stg-link-label">عرض السنوات الدراسية <span aria-hidden="true">←</span></span></div>
    </a></article><article class="stg" data-stg="2"><a class="stg-link" href="/stages/preparatory" aria-labelledby="school-card-preparatory">
      <span class="scr stg-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>أولى لتالتة إعدادي</b></span><span class="scr-in"><img src="/school-home/img/kids-720.webp" srcset="/school-home/img/kids-480.webp 480w, /school-home/img/kids-720.webp 720w" sizes="(min-width: 901px) 34vw, 78vw" width="720" height="224" alt="الإعدادي" loading="lazy" decoding="async"></span></span>
      <div class="stg-t"><h3 id="school-card-preparatory">الإعدادي</h3><p>تلات سنين بتبني الأساس قبل الثانوية، بشرح مفصل وتدريبات في كل حصة.</p><span class="stg-link-label">عرض السنوات الدراسية <span aria-hidden="true">←</span></span></div>
    </a></article><article class="stg" data-stg="3"><a class="stg-link" href="/stages/secondary" aria-labelledby="school-card-secondary">
      <span class="scr stg-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>أولى لتالتة ثانوي</b></span><span class="scr-in"><img src="/school-home/img/teen-800.webp" srcset="/school-home/img/teen-480.webp 480w, /school-home/img/teen-800.webp 800w, /school-home/img/teen-1200.webp 1200w, /school-home/img/teen-1216.webp 1216w" sizes="(min-width: 901px) 34vw, 78vw" width="800" height="1316" alt="الثانوي والثانوية العامة" loading="lazy" decoding="async"></span></span>
      <div class="stg-t"><h3 id="school-card-secondary">الثانوي والثانوية العامة</h3><p>تركيز كامل على المنهج والامتحانات، ومتابعة مستمرة لمستوى كل طالب.</p><span class="stg-link-label">عرض السنوات الدراسية <span aria-hidden="true">←</span></span></div>
    </a></article><article class="stg" data-stg="4">
      <span class="scr stg-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>إنجليزي وألماني</b></span><span class="scr-in"><img src="/school-home/img/langs-599.webp" srcset="/school-home/img/langs-480.webp 480w, /school-home/img/langs-599.webp 599w" sizes="(min-width: 901px) 34vw, 78vw" width="599" height="298" alt="كورسات اللغات" loading="lazy" decoding="async"></span></span>
      <div class="stg-t"><h3>كورسات اللغات</h3><p>كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية، جنب الدراسة أو لوحدها.</p></div>
    </article></div>
</section>

<section class="week" id="week">
  <div class="wk-in">
    <div class="wk-text">
      <h2 data-split>أسبوع منظم، وتقرير يوصلك</h2>
      <p class="lead" data-reveal>جدول دراسي منظم يناسب احتياجات كل مرحلة، صباحاً ومساءً من الأحد للخميس. وفي آخر الأسبوع تقرير بمستوى ولادك وتقدمهم يوصلك إنت.</p>
      <ul class="wk-pts" data-stagger="0.14"><li data-pt><i class="pt-n" aria-hidden="true"><b></b></i><div><h3>مدرسين متخصصين</h3><p>كل مادة مع مدرس متخصص فيها وعنده خبرة في توصيل المعلومة أونلاين.</p></div></li><li data-pt><i class="pt-n" aria-hidden="true"><b></b></i><div><h3>متابعة مستمرة</h3><p>الواجبات والمشاركة والحضور بيتتابعوا حصة بحصة، مش في آخر السنة.</p></div></li><li data-pt><i class="pt-n" aria-hidden="true"><b></b></i><div><h3>تقرير أسبوعي</h3><p>كل أسبوع تقرير واضح بمستوى الطالب وتطوره، وإنت متابع من أي مكان.</p></div></li></ul>
    </div>
    <div class="wk-vis" data-week>
      <div class="tt" data-reveal="scale">
        <div class="tt-grid"><span class="tt-l"></span><span class="tt-d">الأحد</span><span class="tt-d">الاتنين</span><span class="tt-d">التلات</span><span class="tt-d">الأربع</span><span class="tt-d">الخميس</span><span class="tt-l">صباحي</span><span class="tt-c" data-cell style="--i:0"><i></i></span><span class="tt-c" data-cell style="--i:1"><i></i></span><span class="tt-c" data-cell style="--i:2"><i></i></span><span class="tt-c" data-cell style="--i:3"><i></i></span><span class="tt-c" data-cell style="--i:4"><i></i></span><span class="tt-l">مسائي</span><span class="tt-c" data-cell style="--i:5"><i></i></span><span class="tt-c" data-cell style="--i:6"><i></i></span><span class="tt-c" data-cell style="--i:7"><i></i></span><span class="tt-c" data-cell style="--i:8"><i></i></span><span class="tt-c" data-cell style="--i:9"><i></i></span></div>
        <p class="tt-cap">الجدول الأسبوعي: اختار الميعاد اللي يناسب توقيتكم</p>
      </div>
      <div class="rp" data-reveal="up" data-delay="0.2">
        <div class="rp-head"><span class="live sm"><i aria-hidden="true"></i>التقرير الأسبوعي</span><span class="rp-week">الأحد – الخميس</span></div>
        <ul class="rp-rows"><li style="--i:0"><span>الحضور</span><b class="rp-bar"><i></i></b></li><li style="--i:1"><span>المشاركة في الحصة</span><b class="rp-bar"><i></i></b></li><li style="--i:2"><span>الواجبات</span><b class="rp-bar"><i></i></b></li><li style="--i:3"><span>التقدم في المنهج</span><b class="rp-bar"><i></i></b></li></ul>
        <p class="rp-cap">شكل التقرير اللي بيوصل لولي الأمر (نموذج توضيحي)</p>
      </div>
    </div>
  </div>
</section>

<section class="lesson" id="lesson">
  <div class="ls-in">
    <div class="ls-pics">
      <div class="ls-big" data-reveal="clip"><span class="scr ls-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>مباشر</b></span><span class="scr-in"><span data-drift="0.1" data-drift-dur="22"><img src="/school-home/img/teacher-800.webp" srcset="/school-home/img/teacher-480.webp 480w, /school-home/img/teacher-800.webp 800w, /school-home/img/teacher-1200.webp 1200w, /school-home/img/teacher-1600.webp 1600w, /school-home/img/teacher-2400.webp 2400w" sizes="(min-width: 901px) 54vw, 100vw" width="800" height="450" alt="المدرس على الهوا من الاستوديو" loading="lazy" decoding="async"></span></span></span><p class="ls-cap">المدرس على الهوا من الاستوديو</p></div>
      <div class="ls-small" data-reveal="scale" data-delay="0.25"><span class="scr ls-scr2"><span class="scr-bar" aria-hidden="true"><i></i></span><span class="scr-in"><img src="/school-home/img/kids-720.webp" srcset="/school-home/img/kids-480.webp 480w, /school-home/img/kids-720.webp 720w" sizes="(min-width: 901px) 26vw, 70vw" width="720" height="224" alt="الطلاب من بيوتهم" loading="lazy" decoding="async"></span></span><p class="ls-cap">الطلاب من بيوتهم</p></div>
    </div>
    <div class="ls-text">
      <h2 data-split>حصة مباشرة، مش فيديو مسجل</h2>
      <p class="lead" data-reveal>المدرس قدام ولادك على الهوا: بيشرح، بيسأل، بيسمع، وبيرد في نفس اللحظة. وفي مجموعة صغيرة من زمايلهم بتحفزهم يشاركوا.</p>
      <ul class="ls-pts" data-stagger="0.12"><li><h3>حصص تفاعلية</h3><p>الطالب بيشارك ويسأل ويجاوب، مش بيتفرج.</p></li><li><h3>تعلم جماعي</h3><p>مجموعة من زمايل نفس السن بتشجع وبتحفز.</p></li><li><h3>بيئة آمنة</h3><p>من البيت، ومع مدرس معتمد، وولي الأمر متابع.</p></li></ul>
    </div>
  </div>
</section>

<section class="abroad" id="abroad">
  <div class="ab-frame" data-open><div data-drift="0.1" data-drift-dir="left" data-drift-dur="26"><img src="/school-home/img/gulf-800.webp" srcset="/school-home/img/gulf-480.webp 480w, /school-home/img/gulf-800.webp 800w, /school-home/img/gulf-1200.webp 1200w, /school-home/img/gulf-1587.webp 1587w" sizes="100vw" width="800" height="436" alt="الدراسة من أي بيت في العالم" loading="lazy" decoding="async"></div><p class="ab-cap">الدراسة من أي بيت في العالم</p></div>
  <div class="ab-in">
    <div class="ab-text"><h2 data-split>عايشين بره مصر؟ مدرستكم معاكم.</h2><p class="lead" data-reveal>لو إنت أب أو أم عايشين بره مصر، أكيد أكتر حاجة بتشغلك هي مستقبل ولادك ومستواهم التعليمي، وإزاي تضمن إنهم يتعلموا صح حتى لو المسافات بعيدة. لايف سكول أونلاين موجودة عشان ولادك يكملوا تعليمهم خطوة بخطوة من أي مكان، وإنت متابع.</p></div>
    <ul class="ab-pts" data-stagger="0.08"><li>السعودية</li><li>الكويت</li><li>الإمارات</li><li>قطر</li><li>عُمان</li><li>وأي مكان في العالم</li></ul>
  </div>
  <div class="band" data-marquee="46"><div><span>الرياض</span><i class="bd-dot" aria-hidden="true"></i><span>جدة</span><i class="bd-dot" aria-hidden="true"></i><span>الدمام</span><i class="bd-dot" aria-hidden="true"></i><span>الكويت</span><i class="bd-dot" aria-hidden="true"></i><span>دبي</span><i class="bd-dot" aria-hidden="true"></i><span>أبوظبي</span><i class="bd-dot" aria-hidden="true"></i><span>الدوحة</span><i class="bd-dot" aria-hidden="true"></i><span>مسقط</span><i class="bd-dot" aria-hidden="true"></i><span>القاهرة</span><i class="bd-dot" aria-hidden="true"></i><span>وأي مكان</span><i class="bd-dot" aria-hidden="true"></i></div></div>
</section>

<section class="posts" id="posts">
  <div class="ps-in">
    <div class="ps-head"><h2 data-split>من صفحتنا</h2><p class="lead" data-reveal>تابعنا على فيسبوك وشوف آخر الأخبار والمواعيد.</p></div>
    <div class="ps-grid" data-lb-group><figure class="post" data-reveal="up" data-delay="0.0"><button type="button" data-lb data-full="/school-home/img/post-kids-720.webp" data-cap="تعلم أونلاين ممتع وآمن لأطفالك" data-cursor="شوف" aria-label="تعلم أونلاين ممتع وآمن لأطفالك" data-tilt="5"><span class="kit-glare"></span><img src="/school-home/img/post-kids-720.webp" srcset="/school-home/img/post-kids-480.webp 480w, /school-home/img/post-kids-720.webp 720w" sizes="(min-width: 901px) 30vw, 84vw" width="720" height="458" alt="تعلم أونلاين ممتع وآمن لأطفالك" loading="lazy" decoding="async"></button><figcaption>تعلم أونلاين ممتع وآمن لأطفالك</figcaption></figure><figure class="post" data-reveal="up" data-delay="0.1"><button type="button" data-lb data-full="/school-home/img/post-room-720.webp" data-cap="احجزي لأولادك وتابعي مستواهم وإنتي مطمنة" data-cursor="شوف" aria-label="احجزي لأولادك وتابعي مستواهم وإنتي مطمنة" data-tilt="5"><span class="kit-glare"></span><img src="/school-home/img/post-room-720.webp" srcset="/school-home/img/post-room-480.webp 480w, /school-home/img/post-room-720.webp 720w" sizes="(min-width: 901px) 30vw, 84vw" width="720" height="709" alt="احجزي لأولادك وتابعي مستواهم وإنتي مطمنة" loading="lazy" decoding="async"></button><figcaption>احجزي لأولادك وتابعي مستواهم وإنتي مطمنة</figcaption></figure><figure class="post" data-reveal="up" data-delay="0.2"><button type="button" data-lb data-full="/school-home/img/post-langs-599.webp" data-cap="كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية" data-cursor="شوف" aria-label="كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية" data-tilt="5"><span class="kit-glare"></span><img src="/school-home/img/post-langs-599.webp" srcset="/school-home/img/post-langs-480.webp 480w, /school-home/img/post-langs-599.webp 599w" sizes="(min-width: 901px) 30vw, 84vw" width="599" height="579" alt="كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية" loading="lazy" decoding="async"></button><figcaption>كورسات مكثفة لتعليم اللغات: الإنجليزية والألمانية</figcaption></figure></div>
  </div>
</section>

<section class="trial" id="trial">
  <div class="tr-in">
    <div class="tr-text">
      <h2 data-split>احجز حصة تجريبية مجانية</h2>
      <p class="lead" data-reveal>اكتب بياناتك ومرحلة ولادك، والرسالة بتتبعت على واتساب لايف سكول مباشرة. بنرد عليك ونحدد معاك ميعاد الحصة التجريبية.</p>
      <div class="tr-pic" data-reveal="clip"><span class="scr tr-scr"><span class="scr-bar" aria-hidden="true"><i></i><b>مباشر</b></span><span class="scr-in"><span data-drift="0.1" data-drift-dur="20"><img src="/school-home/img/desk-800.webp" srcset="/school-home/img/desk-480.webp 480w, /school-home/img/desk-800.webp 800w, /school-home/img/desk-1200.webp 1200w, /school-home/img/desk-1360.webp 1360w" sizes="(min-width: 901px) 30vw, 90vw" width="800" height="1176" alt="" loading="lazy" decoding="async"></span></span></span></div>
    </div>
    <p class="trial-fallback"><a class="btn" href="https://wa.me/201033150405">احجز على واتساب</a></p>
    <form class="tf" id="trial-form" data-form="trial" data-tf data-wa-form data-wa="201033150405" data-intro="أهلاً لايف سكول أونلاين، عايز أحجز حصة تجريبية مجانية:" novalidate data-reveal="up">
      <div class="tf-grid">
        <label>اسمك<input name="parent" data-label="الاسم" required autocomplete="name"></label>
        <label>الموبايل أو الواتساب<input name="phone" type="tel" data-label="الموبايل" required autocomplete="tel" inputmode="tel" dir="ltr"></label>
        <label>مرحلة الطالب<select name="stage" data-label="المرحلة"><option>الحضانة</option><option>الابتدائي</option><option>الإعدادي</option><option>الثانوي / الثانوية العامة</option><option>كورسات اللغات</option></select></label>
        <label>الميعاد المناسب<select name="time" data-label="الميعاد"><option>صباحي</option><option>مسائي</option><option>أي ميعاد</option></select></label>
        <label class="wide">البلد والمدينة<input name="where" data-label="البلد والمدينة" placeholder="مثلاً: الرياض، السعودية" autocomplete="address-level2"></label>
        <label class="wide">حاجة تانية<textarea name="msg" data-label="ملاحظة" rows="3" placeholder="عدد الأولاد، المواد، أي سؤال…"></textarea></label>
      </div>
      <p class="kit-err" hidden role="alert">من فضلك اكتب اسمك ورقم موبايلك.</p>
      <button class="btn big tf-send" type="submit" data-magnetic disabled><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"/></svg> ابعت على واتساب</button>
      <div class="tf-ok" data-ok hidden>
        <span class="tf-stamp" aria-hidden="true"><span class="live sm"><i aria-hidden="true"></i>مباشر</span><b>جاهزة</b></span>
        <p role="status">رسالتك جاهزة للإرسال. لو واتساب مفتحش، دوس على الزرار.</p>
        <p class="tf-okb"><a class="btn" data-ok-wa href="https://wa.me/201033150405?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D9%84%D8%A7%D9%8A%D9%81%20%D8%B3%D9%83%D9%88%D9%84%20%D8%A3%D9%88%D9%86%D9%84%D8%A7%D9%8A%D9%86%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AA%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D8%A9%20%D8%B9%D9%86%D8%AF%D9%83%D9%85." target="_blank" rel="noopener"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"/></svg> افتح واتساب</a><button type="button" class="btn ghost" data-ok-new>ابعت تاني</button></p>
      </div>
    </form>
  </div>
</section>

<section class="contact" id="contact">
  <div class="ct-in">
    <div class="ct-text">
      <h2 data-split>كلمنا</h2>
      <p class="lead" data-reveal>ابعتلنا على واتساب أو اتصل بينا، ونعرفك تفاصيل نظام الدراسة المناسب لولادك.</p>
    </div>
    <ul class="ct-list" data-stagger="0.08">
      <li><a class="ct-wa" href="https://wa.me/201033150405?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D9%84%D8%A7%D9%8A%D9%81%20%D8%B3%D9%83%D9%88%D9%84%20%D8%A3%D9%88%D9%86%D9%84%D8%A7%D9%8A%D9%86%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%B9%D8%B1%D9%81%20%D8%A3%D9%83%D8%AA%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%AF%D8%B1%D8%A7%D8%B3%D8%A9%20%D8%B9%D9%86%D8%AF%D9%83%D9%85." target="_blank" rel="noopener"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z"/></svg><span>واتساب</span><bdi>01033150405</bdi></a></li>
      <li><a href="tel:+201033150405"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3h3l1.5 4-2 1.3a12 12 0 0 0 6.6 6.6l1.3-2 4 1.5v3A2.6 2.6 0 0 1 18.4 20 15.4 15.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span>اتصال</span><bdi>01033150405</bdi></a></li>
      <li><a href="mailto:mhmdalsydh563@gmail.com"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17zM4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span>إيميل</span><bdi>mhmdalsydh563@gmail.com</bdi></a></li>
      <li><span class="ct-place"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z M12 12.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>الشيخ زايد، الجيزة، مصر</span></span></li>
    </ul>
  </div>
</section>
<div class="kit-cursor" aria-hidden="true"><span class="kit-cdot"></span><span class="kit-cring"><span class="kit-clabel"></span></span></div>
`;
