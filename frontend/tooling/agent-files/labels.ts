import type { ProjectLinkKind } from '../../src/entities/project/model/projectLinks.ts'
import type { Project } from '../../src/entities/project/model/types.ts'
import type { SkillCategory } from '../../src/entities/skill/model/categories.ts'
import type { Locale, RouteId } from './routes.ts'

export interface TwinLabels {
  technologies: string
  pages: string
  openToWork: string
  nav: Record<RouteId, string>
  featuredProjects: string
  links: Record<ProjectLinkKind, string>
  types: Record<Project['type'], string>
  aboutCoreCompetencies: string
  aboutLanguages: string
  aboutSentenceTitle: string
  downloadCv: string
  skillsHeading: string
  skillCategories: Record<SkillCategory, string>
  experienceHeading: string
  present: string
  projectsHeading: string
  contactHeading: string
  contactDescription: string
  contactEmail: string
  contactLocation: string
  contactSocial: string
}

// Labels that exist behind an i18n key mirror it exactly (a test enforces the
// parity); the rest are twin-specific wording with no UI counterpart.
export const TWIN_LABELS: Record<Locale, TwinLabels> = {
  en: {
    technologies: 'Technologies',
    pages: 'Pages',
    openToWork: 'Open to work',
    nav: {
      home: 'Home',
      about: 'About',
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      contact: 'Contact',
    },
    featuredProjects: 'Featured Projects',
    links: {
      site: 'Visit Site',
      download: 'Download',
      googlePlay: 'Google Play',
      repository: 'Repository',
      documentation: 'Documentation',
    },
    types: {
      WEB: 'Web App',
      DESKTOP: 'Desktop App',
      MOBILE: 'Mobile App',
      OTHER: 'Other',
    },
    aboutCoreCompetencies: 'Core Competencies',
    aboutLanguages: 'Languages',
    aboutSentenceTitle: 'A sentence that defines me',
    downloadCv: 'Download CV',
    skillsHeading: 'Technical Expertise',
    skillCategories: {
      Backend: 'Backend',
      Frontend: 'Frontend',
      Database: 'Databases',
      Tools: 'Tools',
      Other: 'Other',
      Mobile: 'Mobile',
      Desktop: 'Desktop',
    },
    experienceHeading: 'Work History',
    present: 'Present',
    projectsHeading: 'All Projects',
    contactHeading: 'Get in Touch',
    contactDescription:
      'I am open to new professional opportunities. If you have a project or a job offer, I would love to hear from you.',
    contactEmail: 'Email',
    contactLocation: 'Location',
    contactSocial: 'FOLLOW ME',
  },
  es: {
    technologies: 'Tecnologías',
    pages: 'Páginas',
    openToWork: 'Disponible para trabajar',
    nav: {
      home: 'Inicio',
      about: 'Sobre mí',
      skills: 'Habilidades',
      experience: 'Experiencia',
      projects: 'Proyectos',
      contact: 'Contacto',
    },
    featuredProjects: 'Proyectos destacados',
    links: {
      site: 'Visitar web',
      download: 'Descargar',
      googlePlay: 'Google Play',
      repository: 'Repositorio',
      documentation: 'Documentación',
    },
    types: {
      WEB: 'App web',
      DESKTOP: 'App de escritorio',
      MOBILE: 'App móvil',
      OTHER: 'Otro',
    },
    aboutCoreCompetencies: 'Competencias principales',
    aboutLanguages: 'Idiomas',
    aboutSentenceTitle: 'Una frase que me define',
    downloadCv: 'Descargar CV',
    skillsHeading: 'Conocimientos técnicos',
    skillCategories: {
      Backend: 'Backend',
      Frontend: 'Frontend',
      Database: 'Bases de datos',
      Tools: 'Herramientas',
      Other: 'Otros',
      Mobile: 'Móvil',
      Desktop: 'Escritorio',
    },
    experienceHeading: 'Historial laboral',
    present: 'Actualidad',
    projectsHeading: 'Todos los proyectos',
    contactHeading: 'Ponte en contacto',
    contactDescription:
      'Estoy abierto a nuevas oportunidades profesionales. Si tienes un proyecto o una oferta de trabajo, me encantaría escucharte.',
    contactEmail: 'Correo',
    contactLocation: 'Ubicación',
    contactSocial: 'SÍGUEME',
  },
}
