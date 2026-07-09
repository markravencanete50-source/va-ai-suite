export type DocType = "proposal" | "sow" | "onboarding" | "case_study";

export interface DocResult {
  title: string;
  subtitle: string;
  sections: {
    heading: string;
    body: string;
    bullets: string[];
  }[];
}

const BASE =
  "You are a senior operations and proposal writer for a virtual assistant (VA) and offshore staffing agency. " +
  "Respond ONLY with a single valid JSON object. No markdown, no preamble, no explanations. " +
  'Schema: {"title":"...","subtitle":"...","sections":[{"heading":"...","body":"...","bullets":["..."]}]} — ' +
  "5 to 7 sections. body is 2-4 full sentences. bullets is 0-5 short items (use [] when a section needs none).";

export const DOC_PROMPTS: Record<
  DocType,
  { label: string; system: string; user: (brief: string) => string }
> = {
  proposal: {
    label: "Client proposal",
    system: BASE,
    user: (brief) =>
      `Write a client-facing service proposal. Sections should cover: the client's situation, proposed solution, scope of services, how the engagement works, pricing approach (describe structure, no hard numbers unless given), and next steps. Brief: ${brief}`,
  },
  sow: {
    label: "Statement of work",
    system: BASE,
    user: (brief) =>
      `Write a statement of work. Sections should cover: objectives, in-scope services, out-of-scope items, deliverables and cadence, roles and responsibilities, and acceptance/review process. Brief: ${brief}`,
  },
  onboarding: {
    label: "Onboarding pack",
    system: BASE,
    user: (brief) =>
      `Write a new-client onboarding pack. Sections should cover: welcome and what to expect, kickoff checklist, tools and access needed, communication cadence and channels, first 30 days plan, and escalation/support. Brief: ${brief}`,
  },
  case_study: {
    label: "Case study",
    system: BASE,
    user: (brief) =>
      `Write a marketing case study. Sections should cover: client background, the challenge, the solution we deployed, implementation highlights, results (use plausible placeholder metrics marked [X] if numbers not given), and a closing pull-quote section. Brief: ${brief}`,
  },
};
