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

const followUps = [
  ["kindergarten-1", "Counting My Toys", "Say the number before the toy name. Say one ball, then two balls.", "One ball. Two balls. Three dolls.", "You can see two toy cars. How many cars are there?", "Two cars."],
  ["kindergarten-2", "Animals and Sounds", "Use this is to name an animal you can see.", "This is a cat. A cat says meow.", "Point to a dog and name it.", "This is a dog."],
  ["primary-1", "Where Is It?", "Use in for inside, on for a surface and under for below.", "The pencil is in the bag. The book is on the desk.", "The ball is below the chair. Complete: The ball is ___ the chair.", "The ball is under the chair."],
  ["primary-2", "My Favourite Food", "Use I like or I don't like to talk about your preferences.", "I like apples. I don't like onions.", "Say that you enjoy bananas but you do not enjoy lemons.", "I like bananas. I don't like lemons."],
  ["primary-3", "How Often?", "Put usually, sometimes or never before a main verb like read or play.", "I usually read after dinner. I sometimes play football.", "Say you play chess on some days.", "I sometimes play chess."],
  ["primary-4", "A Visit to the Market", "Ask how many with countable things and how much with things you measure.", "How many oranges do we need? How much rice do we need?", "Ask about the amount of milk for a recipe.", "How much milk do we need?"],
  ["primary-5", "A Weekend Plan", "Use am, is or are + going to + a verb to describe a plan.", "I'm going to visit my cousin. We are going to play tennis.", "Tell a friend about your plan to make a cake on Saturday.", "I'm going to make a cake on Saturday."],
  ["primary-6", "Writing a Friendly Email", "Start with a greeting, explain why you are writing, and close with your name.", "Hi Sara, Would you like to come to my birthday party on Friday? See you soon, Mona", "Invite a friend to meet you at the library on Tuesday.", "Hi Omar, Would you like to meet me at the library on Tuesday? See you soon, Ali"],
  ["preparatory-1", "Making Polite Requests", "Start a polite question with Could you and follow it with a base verb.", "Could you open the window, please?", "Ask someone to repeat the last sentence.", "Could you repeat the last sentence, please?"],
  ["preparatory-2", "Telling a Story in Order", "Use first, then, after that and finally to guide the reader through events.", "First, we packed our bags. Then we took the bus. Finally, we reached the museum.", "Put these events in order: arrive at the library, borrow a book, go home.", "First, we arrived at the library. Then we borrowed a book. Finally, we went home."],
  ["preparatory-3", "Giving Advice", "Use should for advice and shouldn't to advise against something.", "You should practise a little every day. You shouldn't leave everything until the night before.", "Give a friend one tip about staying focused while studying.", "You should put your phone away while you study."],
  ["secondary-1", "Reading Between the Lines", "Support an inference with details from the text. Distinguish the clue from your conclusion.", "Nour checked the clock twice before the results appeared. This suggests she was eager to see them.", "Omar brought an umbrella and wore boots. What weather did he probably expect?", "He probably expected rain. His umbrella and boots are clues."],
  ["secondary-2", "Writing a Formal Request", "State the purpose early, add the details the reader needs, and end with a polite request.", "Dear Ms Ali, I am writing to ask for an extension on the science project. Would it be possible to submit it on Monday?", "Write a polite request to borrow a projector for a Thursday presentation.", "Dear Mr Hassan, I am writing to ask if our group could borrow a projector for our presentation on Thursday. Thank you for considering our request."],
  ["secondary-3", "Addressing a Counterargument", "Acknowledge a reasonable objection before explaining how your proposal addresses it.", "Some students may worry that group work is unfair. However, assigning clear roles helps everyone contribute.", "Respond to the concern that a school reading programme might take time away from other subjects.", "A reading programme does take time, but a short weekly session can build comprehension skills that students use in other subjects."],
] as const;

type LessonOutline = readonly [
  gradeId: string, title: string, rule: string, example: string, challenge: string, answer: string,
];

function buildCourses(lessons: readonly LessonOutline[], suffix = ""): Course[] {
  return lessons.map(([gradeId, title, rule, example, challenge, answer]) => {
    const id = `languages-english-${gradeId}${suffix}`;
    const unitId = `${id}-u1`;
    return {
      id,
      title,
      description: rule,
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
  });
}

export const languageCourses = [
  ...buildCourses(starters),
  ...buildCourses(followUps, "-practice"),
];
