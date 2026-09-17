// A small, hand-labeled "golden set": for each question, we (the humans
// who wrote the fixture) know exactly which page(s) of the document
// actually contain the relevant information. That known-correct answer
// is what lets us score retrieval automatically instead of eyeballing it.
export interface EvalCase {
  name: string;
  question: string;
  fixturePath: string;
  // Page numbers a good retrieval step should surface for this question.
  expectedRelevantPages: number[];
}

const FIXTURE = "fixtures/client-notes-paged.pdf";

export const evalCases: EvalCase[] = [
  {
    name: "retention (spans two pages)",
    question: "Why might customer retention be declining?",
    fixturePath: FIXTURE,
    expectedRelevantPages: [2, 7],
  },
  {
    name: "IT projects",
    question: "What IT projects are planned or underway?",
    fixturePath: FIXTURE,
    expectedRelevantPages: [3],
  },
  {
    name: "office lease",
    question: "What's the status of the office lease?",
    fixturePath: FIXTURE,
    expectedRelevantPages: [4],
  },
  {
    name: "marketing budget",
    question: "How is the marketing budget being allocated this quarter?",
    fixturePath: FIXTURE,
    expectedRelevantPages: [5],
  },
  {
    name: "travel policy",
    question: "What changed in the corporate travel policy?",
    fixturePath: FIXTURE,
    expectedRelevantPages: [6],
  },
];
