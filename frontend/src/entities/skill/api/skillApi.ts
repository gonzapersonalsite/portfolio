import skillsData from './data.json' with { type: 'json' }
import type { Skill } from '../model/types.ts'
import {
  CORE_SKILL_CATEGORIES,
  CORE_SKILL_LEVEL,
  SKILL_CATEGORY_ORDER,
  toSkillCategory,
  type SkillCategory,
} from '../model/categories.ts'

export interface SkillGroup {
  category: SkillCategory
  skills: Skill[]
}

const skills: Skill[] = skillsData.map((skill) => ({ ...skill, category: toSkillCategory(skill.category) }))

export const getAllSkills = (): Skill[] => skills

// Non-empty categories in display order; each keeps the data order of its skills.
export const getSkillGroups = (): SkillGroup[] =>
  SKILL_CATEGORY_ORDER.map((category) => ({
    category,
    skills: getAllSkills().filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0)

// The single core-competency criterion, shared by the About page, its markdown twin and the JSON-LD.
export const getCoreSkillGroups = (): SkillGroup[] =>
  getSkillGroups()
    .filter((group) => CORE_SKILL_CATEGORIES.has(group.category))
    .map((group) => ({ ...group, skills: group.skills.filter((skill) => skill.level >= CORE_SKILL_LEVEL) }))
    .filter((group) => group.skills.length > 0)

export const getCoreSkills = (): Skill[] => getCoreSkillGroups().flatMap((group) => group.skills)
