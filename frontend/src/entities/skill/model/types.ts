import type { SkillCategory } from './categories.ts'

export interface Skill {
  id: string
  nameEn: string
  nameEs: string
  level: number
  appliedEn: string
  appliedEs: string
  category: SkillCategory
  order: number
}
