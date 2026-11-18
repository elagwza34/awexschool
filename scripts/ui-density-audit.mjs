import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const phase = process.argv[2];
const label = process.env.UI_AUDIT_LABEL ?? "density";
if (!/^[a-z-]+$/.test(label)) throw new Error("Invalid audit label");
if (!["before", "after"].includes(phase))
  throw new Error("Use before or after");
const routes = [
  "/",
  "/courses",
  "/courses/math-prep-1",
  "/teachers/ahmed-hassan",
  "/pricing",
  "/login",
  "/student",
  "/student/schedule",
  "/student/chat",
  "/teacher/profile",
  "/teacher/sessions",
  "/parent/courses",
  "/admin",
  "/admin/users",
  "/admin/team",
  "/admin/chat",
  "/manager",
  "/support/requests",
  "/customer-service/requests",
];
const directory = "docs/ui/qa";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const samples = [];
try {
  const page = await browser.newPage();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:3000${route}`);
      await page.evaluate(() => document.fonts.ready);
      const sample = await page.evaluate(() => {
        const main = document.querySelector("main");
        return {
          text: main.textContent.replace(/\s+/g, " ").trim(),
          links: main.querySelectorAll("a").length,
          buttons: main.querySelectorAll("button").length,
          fields: main.querySelectorAll("input,select,textarea").length,
          height: document.documentElement.scrollHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      samples.push({ route, width, ...sample });
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/${label}-${phase}.json`,
  JSON.stringify(samples, null, 2),
);
if (phase === "after") {
  const previous = JSON.parse(
    await readFile(`${directory}/${label}-before.json`, "utf8"),
  );
  const failures = [];
  for (const sample of samples) {
    const before = previous.find(
      (item) => item.route === sample.route && item.width === sample.width,
    );
    for (const key of ["text", "links", "buttons", "fields"]) {
      if (before[key] !== sample[key])
        failures.push(`${sample.width} ${sample.route}: ${key} changed`);
    }
    if (sample.overflow)
      failures.push(`${sample.width} ${sample.route}: horizontal overflow`);
  }
  const beforeTotal = previous.reduce((sum, item) => sum + item.height, 0);
  const afterTotal = samples.reduce((sum, item) => sum + item.height, 0);
  const report = {
    samples: samples.length,
    failures,
    combinedHeightReductionPercent: Math.round(
      (1 - afterTotal / beforeTotal) * 100,
    ),
  };
  await writeFile(
    `${directory}/${label}-comparison.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  if (failures.length) process.exitCode = 1;
} else console.log(`Captured ${samples.length} baseline samples`);
