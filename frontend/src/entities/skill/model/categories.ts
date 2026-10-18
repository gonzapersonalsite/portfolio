// Display order of the skill groups on the Skills page and in its twin: the development stacks
// first (the ones the featured projects are built with), infrastructure and general skills last.
export const SKILL_CATEGORY_ORDER = ['Frontend', 'Backend', 'Mobile', 'Desktop', 'Database', 'Tools', 'Other'] as const

export type SkillCategory = (typeof SKILL_CATEGORY_ORDER)[number]

// Core competencies (About page and its twin): development skills at this level or above.
export const CORE_SKILL_CATEGORIES: ReadonlySet<SkillCategory> = new Set([
  'Frontend',
  'Backend',
  'Database',
  'Mobile',
  'Desktop',
])

export const CORE_SKILL_LEVEL = 70
