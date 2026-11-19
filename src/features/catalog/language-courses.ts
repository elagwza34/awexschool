import type { Course } from "./types";

// Original starter lessons, sequenced by grade for the Languages track.
const starters = [
  ["kindergarten-1", "Hello and Goodbye", "Use hello when you meet someone and goodbye when you leave.", "Hello, Maya! Goodbye, Maya!", "You meet your friend at school. What do you say?", "Hello!"],
  ["kindergarten-2", "Colours Around Us", "Say the colour before the thing it describes.", "a red apple · a blue bag", "Your pencil is green. Say it in a short phrase.", "a green pencil"],
  ["primary-1", "Things in My School Bag", "Use a before a consonant sound and an before a vowel sound.", "a pencil · an eraser", "Choose a or an: I have ___ ruler.", "I have a ruler."],
  ["primary-2", "What Can You Do?", "Use can with the base form of an action word.", "I can draw. She can swim.", "Say that your brother knows how to ride a bike.", "My brother can ride a bike."],
  ["primary-3", "My Morning Routine", "Use the present simple for routines. With he or she, most verbs take -s.", "I walk to school. She walks to school.", "Finish the sentence: Every morning, Omar ___ (read) a story.", "Every morning, Omar reads a story."],
  ["primary-4", "What Is Happening Now?", "Use am, is or are with an -ing verb for an action in progress.", "We are reading. Nadia is writing.", "Describe two children playing now: They ___ (play).", "They are playing."],
  ["primary-5", "A Story About Yesterday", "Use the past simple for finished actions. Some verbs change form instead of adding -ed.", "We visited the park. We went home at six.", "Put go in the past: Yesterday I ___ to the library.", "Yesterday I went to the library."],
  ["primary-6", "Comparing Two Places", "Use -er than with many short adjectives and more ... than with longer ones.", "The park is quieter than the market. The museum is more crowded than the library.", "Compare two streets using busy: King Street is ___ Green Street.", "King Street is busier than Green Street."],
  ["preparatory-1", "Giving Clear Directions", "Start instructions with an action verb. Use landmarks to make the route clear.", "Turn left at the bank. The library is next to the bakery.", "Tell a visitor to walk straight and turn right at the school.", "Go straight, then turn right at the school."],
  ["preparatory-2", "Talking About Experiences", "Use have or has and a past participle to talk about experiences without giving a finished time.", "I have visited Aswan. Has she ever ridden a train?", "Ask a friend about visiting Luxor.", "Have you ever visited Luxor?"],
  ["preparatory-3", "Plans and Conditions", "Use if + present simple and will + base verb for a likely future result.", "If it rains, we will stay indoors.", "Finish a study plan: If I finish early, I ___ (help) my sister.", "If I finish early, I will help my sister."],
  ["secondary-1", "Explaining Cause and Effect", "Use because to introduce a reason and therefore to introduce a result.", "The match was cancelled because it rained. It rained; therefore, the match was cancelled.", "Connect these ideas with because: The plants grew well. They received enough light.", "The plants grew well because they received enough light."],
  ["secondary-2", "Reporting What Someone Said", "In a past report, the original present tense often shifts to past. Change pronouns to match the speaker.", "Lina said, ‘I am ready.’ → Lina said that she was ready.", "Report: Adam said, ‘I need more time.’", "Adam said that he needed more time."],
  ["secondary-3", "Building an Argument", "State a claim, explain your reason, and support it with a concrete example.", "Schools should offer reading time. It helps students build vocabulary. For example, a weekly reading log introduces students to words in context.", "Support this claim with a reason and an example: Schools should reduce single-use plastic.", "Schools should reduce single-use plastic because it creates avoidable waste. For example, refill stations let students reuse the same bottle each day."],
] as const;

export const languageCourses: Course[] = starters.map(
  ([gradeId, title, rule, example, challenge, answer]) => {
    const id = `languages-english-${gradeId}`;
    const unitId = `${id}-u1`;
    return {
      id,
      title,
      description: `English starter lesson. ${rule}`,
      gradeId,
      track: "languages",
      subjectId: "english",
      teacherId: "nour-ibrahim",
      term: "الفصل الدراسي الأول",
      price: 0,
      units: [{
        id: unitId,
        title,
        lessons: [{
          id: `${unitId}-l1`,
          title,
          minutes: gradeId.startsWith("kindergarten") ? 5 : 10,
          preview: true,
          summary: rule,
          objectives: ["Understand the pattern through an example", "Try the pattern and check your answer"],
          previewSteps: [
            { title: "Learn the pattern", text: rule, example, direction: "ltr" },
            { title: "Try it", text: "Say or write your answer before moving on.", example: challenge, direction: "ltr" },
            { title: "Check your answer", text: "Compare your answer with this example.", example: answer, direction: "ltr" },
          ],
        }],
      }],
    };
  },
);
