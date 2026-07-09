export type SuggestionType = "captions" | "seo" | "icp";

export interface CaptionResult {
  captions: {
    platform: string;
    text: string;
    hashtags: string[];
    best_time: string;
  }[];
}

export interface SeoResult {
  primary_keyword: string;
  secondary_keywords: string[];
  title_options: string[];
  meta_description: string;
  content_ideas: string[];
}

export interface IcpResult {
  segments: {
    name: string;
    industry: string;
    company_size: string;
    decision_maker: string;
    pain_points: string[];
    where_to_find: string;
    pitch_angle: string;
  }[];
}

const BASE =
  "You are a senior social media and marketing strategist for virtual assistant (VA) and offshore staffing services. " +
  "Respond ONLY with a single valid JSON object. No markdown, no preamble, no explanations.";

export const PROMPTS: Record<
  SuggestionType,
  { label: string; system: string; user: (brief: string) => string }
> = {
  captions: {
    label: "Social captions",
    system:
      BASE +
      ' Schema: {"captions":[{"platform":"LinkedIn|Facebook|Instagram|X","text":"...","hashtags":["..."],"best_time":"..."}]} — exactly 4 captions, one per platform.',
    user: (brief) =>
      `Write 4 platform-specific social media captions for this brief. Make each caption native to its platform (LinkedIn professional, Instagram visual/emotive, X punchy, Facebook conversational). Brief: ${brief}`,
  },
  seo: {
    label: "SEO pack",
    system:
      BASE +
      ' Schema: {"primary_keyword":"...","secondary_keywords":["..."],"title_options":["..."],"meta_description":"...","content_ideas":["..."]} — 5 secondary keywords, 3 titles, 5 content ideas. Meta description under 155 characters.',
    user: (brief) =>
      `Create an SEO content pack targeting clients searching for these services. Brief: ${brief}`,
  },
  icp: {
    label: "ICP profiles",
    system:
      BASE +
      ' Schema: {"segments":[{"name":"...","industry":"...","company_size":"...","decision_maker":"...","pain_points":["..."],"where_to_find":"...","pitch_angle":"..."}]} — exactly 3 segments, 3 pain points each.',
    user: (brief) =>
      `Build 3 ideal customer profile segments for this service offering, with the exact job title of the decision maker and where to find them (LinkedIn groups, communities, directories). Brief: ${brief}`,
  },
};
