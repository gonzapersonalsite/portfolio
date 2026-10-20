import { getProfile } from '../../src/entities/profile/api/profileApi.ts'
import { getAllProjects } from '../../src/entities/project/api/projectApi.ts'
import { projectCoverSources } from '../../src/entities/project/model/projectImages.ts'
import { APP_ROUTES, localizedPath, markdownTwinPath, type RouteId } from '../../src/shared/config/routes.ts'

export { absoluteUrl } from '../../src/shared/config/site.ts'
export { localizedPath }

export type Locale = 'en' | 'es'

export const LOCALES: readonly Locale[] = ['en', 'es']

export type { RouteId }

export interface ImagePreload {
  src: string
  srcSet?: string
  sizes?: string
}

export interface LocalizedShellMeta {
  title: string
  description: string
}

export interface RouteSpec {
  id: RouteId
  path: string
  shellTitle: string
  shellDescription: string
  meta: Record<Locale, LocalizedShellMeta>
  // The route's LCP image when it sits above the fold. The shell preloads it so the request
  // starts with the HTML instead of after the JavaScript renders the <img>; the sources must
  // be exactly the ones that <img> uses.
  lcpImage?: () => ImagePreload
}

type RouteShell = Omit<RouteSpec, 'id' | 'path' | 'shellTitle' | 'shellDescription'>

// The shell metadata mirrors what each page applies at runtime through
// usePageMeta (seo.<route> in shared/config/i18n.ts); a test keeps them in sync.
const SHELLS: Record<RouteId, RouteShell> = {
  home: {
    meta: {
      en: {
        title: 'Gonzalo Martínez | Junior Full Stack Developer',
        description:
          'Portfolio of Gonzalo Martínez, Junior Full Stack Developer in Palma de Mallorca, Spain: web, desktop and mobile apps with React, TypeScript, Spring Boot, .NET and Flutter.',
      },
      es: {
        title: 'Gonzalo Martínez | Desarrollador Full Stack junior',
        description:
          'Portafolio de Gonzalo Martínez, desarrollador Full Stack junior en Palma de Mallorca, España: aplicaciones web, de escritorio y móviles con React, TypeScript, Spring Boot, .NET y Flutter.',
      },
    },
  },
  about: {
    meta: {
      en: {
        title: 'About Me | Gonzalo Martínez',
        description:
          'Learn about Gonzalo Martínez, a Junior Full Stack Developer based in Palma de Mallorca, Spain: his journey, philosophy, skills and professional background.',
      },
      es: {
        title: 'Sobre mí | Gonzalo Martínez',
        description:
          'Conoce a Gonzalo Martínez, desarrollador Full Stack junior en Palma de Mallorca, España: su trayectoria, filosofía, habilidades y experiencia profesional.',
      },
    },
    // AboutPage renders the profile photo eagerly with high priority.
    lcpImage: () => ({ src: getProfile().imageUrl }),
  },
  skills: {
    meta: {
      en: {
        title: 'Skills | Gonzalo Martínez',
        description:
          'Explore the technical skills of Gonzalo Martínez, a Junior Full Stack Developer working with React, TypeScript, Java and Spring Boot, plus .NET, Flutter and Kotlin for desktop and mobile.',
      },
      es: {
        title: 'Habilidades | Gonzalo Martínez',
        description:
          'Explora las habilidades técnicas de Gonzalo Martínez, desarrollador Full Stack junior que trabaja con React, TypeScript, Java y Spring Boot, además de .NET, Flutter y Kotlin para escritorio y móvil.',
      },
    },
  },
  experience: {
    meta: {
      en: {
        title: 'Experience | Gonzalo Martínez',
        description:
          'Professional experience of Gonzalo Martínez, Junior Full Stack Developer: microservices with Java Spring Boot and React, IAM, CI/CD and on-premise infrastructure.',
      },
      es: {
        title: 'Experiencia | Gonzalo Martínez',
        description:
          'Experiencia profesional de Gonzalo Martínez, desarrollador Full Stack junior: microservicios con Java Spring Boot y React, IAM, CI/CD e infraestructura on-premise.',
      },
    },
  },
  projects: {
    meta: {
      en: {
        title: 'Projects | Gonzalo Martínez',
        description:
          'Browse portfolio projects by Gonzalo Martínez, showcasing web, desktop and mobile applications built with React, TypeScript, .NET and Flutter.',
      },
      es: {
        title: 'Proyectos | Gonzalo Martínez',
        description:
          'Explora los proyectos de Gonzalo Martínez, que muestran aplicaciones web, de escritorio y móviles construidas con React, TypeScript, .NET y Flutter.',
      },
    },
    // ProjectsPage renders the first card with priority.
    lcpImage: () => projectCoverSources(getAllProjects()[0]),
  },
  contact: {
    meta: {
      en: {
        title: 'Contact | Gonzalo Martínez',
        description:
          'Get in touch with Gonzalo Martínez for professional opportunities, collaborations, or project inquiries. Based in Palma de Mallorca, Spain.',
      },
      es: {
        title: 'Contacto | Gonzalo Martínez',
        description:
          'Ponte en contacto con Gonzalo Martínez para oportunidades profesionales, colaboraciones o consultas sobre proyectos. En Palma de Mallorca, España.',
      },
    },
  },
}

// Same routes and order as the SPA router (shared/config/routes.ts).
export const ROUTES: readonly RouteSpec[] = APP_ROUTES.map(({ id, path }) => ({
  id,
  path,
  shellTitle: SHELLS[id].meta.es.title,
  shellDescription: SHELLS[id].meta.es.description,
  ...SHELLS[id],
}))

export const HOME_ROUTE: RouteSpec = ROUTES[0]

export const htmlFileOf = (route: RouteSpec, locale: Locale = 'es'): string => {
  const path = localizedPath(route.path, locale)
  return path === '/' ? 'index.html' : `${path.slice(1)}/index.html`
}

// Same file names as the markdown alternates the SPA points at after a navigation.
export const twinPathOf = (route: RouteSpec, locale: Locale): string => markdownTwinPath(route.path, locale)
