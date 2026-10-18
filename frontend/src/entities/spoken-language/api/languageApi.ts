import languagesData from './data.json' with { type: 'json' }
import type { SpokenLanguage } from '../model/types.ts'

export const getAllSpokenLanguages = (): SpokenLanguage[] => languagesData as SpokenLanguage[]
