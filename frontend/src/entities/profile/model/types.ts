export interface FocusArea {
  labelEn: string
  labelEs: string
  technologies: string[]
}

export interface Profile {
  id: string
  subtitleEn: string
  subtitleEs: string
  descriptionEn: string
  descriptionEs: string
  focusAreas: FocusArea[]
  aboutTitleEn: string
  aboutTitleEs: string
  aboutIntroTitleEn: string
  aboutIntroTitleEs: string
  aboutSummaryEn: string
  aboutSummaryEs: string
  aboutPhilosophyEn: string
  aboutPhilosophyEs: string
  sentenceEn: string
  sentenceEs: string
  cvUrl: string
  fullNameEn: string
  fullNameEs: string
  alternateName: string
  email: string
  githubUrl: string
  linkedinUrl: string
  locationEn: string
  locationEs: string
  logoText: string
  imageUrl: string
}
