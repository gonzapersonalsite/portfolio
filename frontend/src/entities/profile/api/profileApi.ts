import profileData from './data.json' with { type: 'json' }
import type { Profile } from '../model/types.ts'

export const getProfile = (): Profile => profileData as Profile
