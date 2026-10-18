import experiencesData from './data.json' with { type: 'json' }
import type { Experience } from '../model/types.ts'

export const getAllExperiences = (): Experience[] => experiencesData as Experience[]
