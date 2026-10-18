import type { SkillCategory } from './categories.ts'

export interface Skill {
  id: string
  nameEn: string
  nameEs: string
  level: number
  category: SkillCategory
  order: number
}
