import skillsData from './data.json' with { type: 'json' }
import type { Skill } from '../model/types.ts'
import {
  CORE_SKILL_CATEGORIES,
  CORE_SKILL_LEVEL,
  SKILL_CATEGORY_ORDER,
  type SkillCategory,
} from '../model/categories.ts'

export interface SkillGroup {
  category: SkillCategory
  skills: Skill[]
}

export const getAllSkills = (): Skill[] => skillsData as Skill[]

// Non-empty categories in display order; each keeps the data order of its skills.
export const getSkillGroups = (): SkillGroup[] =>
  SKILL_CATEGORY_ORDER.map((category) => ({
    category,
    skills: getAllSkills().filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0)

// The single core-competency criterion, shared by the About page and its markdown twin.
export const getCoreSkills = (): Skill[] =>
  getSkillGroups()
    .filter((group) => CORE_SKILL_CATEGORIES.has(group.category))
    .flatMap((group) => group.skills.filter((skill) => skill.level >= CORE_SKILL_LEVEL))
