// Display order of the skill groups on the Skills page and in its twin: the development stacks
// first (the ones the featured projects are built with), infrastructure and general skills last.
export const SKILL_CATEGORY_ORDER = ['Frontend', 'Backend', 'Mobile', 'Desktop', 'Database', 'Tools', 'Other'] as const

export type SkillCategory = (typeof SKILL_CATEGORY_ORDER)[number]

// The JSON types every category as a plain string; this narrows it at the data boundary and
// fails at load time instead of rendering an untranslated group.
export const toSkillCategory = (value: string): SkillCategory => {
  const category = SKILL_CATEGORY_ORDER.find((known) => known === value)
  if (category === undefined) throw new Error(`Unknown skill category in the skill data: ${value}`)
  return category
}

// Core competencies (About page and its twin): development skills at this level or above.
export const CORE_SKILL_CATEGORIES: ReadonlySet<SkillCategory> = new Set([
  'Frontend',
  'Backend',
  'Database',
  'Mobile',
  'Desktop',
])

export const CORE_SKILL_LEVEL = 70
