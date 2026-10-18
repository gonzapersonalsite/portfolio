import { getProfile } from '../../src/entities/profile/api/profileApi.ts'
import { getAllProjects } from '../../src/entities/project/api/projectApi.ts'
import { projectCoverSources } from '../../src/entities/project/model/projectImages.ts'
import { APP_ROUTES, markdownTwinPath, type RouteId } from '../../src/shared/config/routes.ts'

export { absoluteUrl } from '../../src/shared/config/site.ts'

export type Locale = 'en' | 'es'

export type { RouteId }

export interface ImagePreload {
  src: string
  srcSet?: string
  sizes?: string
}

export interface RouteSpec {
  id: RouteId
  path: string
  shellTitle: string
  shellDescription: string
  // The route's LCP image when it sits above the fold. The shell preloads it so the request
  // starts with the HTML instead of after the JavaScript renders the <img>; the sources must
  // be exactly the ones that <img> uses.
  lcpImage?: () => ImagePreload
}

type RouteShell = Omit<RouteSpec, 'id' | 'path'>

// The shell metadata mirrors what each page applies at runtime through
// usePageMeta (seo.<route> in shared/config/i18n.ts); a test keeps them in sync.
const SHELLS: Record<RouteId, RouteShell> = {
  home: {
    shellTitle: 'Gonzalo Martínez | Junior Full Stack Developer',
    shellDescription:
      'Portfolio of Gonzalo Martínez, Junior Full Stack Developer in Palma de Mallorca, Spain: web, desktop and mobile apps with React, TypeScript, Spring Boot, .NET and Flutter.',
  },
  about: {
    shellTitle: 'About Me | Gonzalo Martínez',
    shellDescription:
      'Learn about Gonzalo Martínez, a Junior Full Stack Developer based in Palma de Mallorca, Spain: his journey, philosophy, skills and professional background.',
    // AboutPage renders the profile photo eagerly with high priority.
    lcpImage: () => ({ src: getProfile().imageUrl }),
  },
  skills: {
    shellTitle: 'Skills | Gonzalo Martínez',
    shellDescription:
      'Explore the technical skills of Gonzalo Martínez, a Junior Full Stack Developer working with React, TypeScript, Java and Spring Boot, plus .NET, Flutter and Kotlin for desktop and mobile.',
  },
  experience: {
    shellTitle: 'Experience | Gonzalo Martínez',
    shellDescription:
      'Professional experience of Gonzalo Martínez, Junior Full Stack Developer: microservices with Java Spring Boot and React, IAM, CI/CD and on-premise infrastructure.',
  },
  projects: {
    shellTitle: 'Projects | Gonzalo Martínez',
    shellDescription:
      'Browse portfolio projects by Gonzalo Martínez, showcasing web, desktop and mobile applications built with React, TypeScript, .NET and Flutter.',
    // ProjectsPage renders the first card with priority.
    lcpImage: () => projectCoverSources(getAllProjects()[0]),
  },
  contact: {
    shellTitle: 'Contact | Gonzalo Martínez',
    shellDescription:
      'Get in touch with Gonzalo Martínez for professional opportunities, collaborations, or project inquiries. Based in Palma de Mallorca, Spain.',
  },
}

// Same routes and order as the SPA router (shared/config/routes.ts).
export const ROUTES: readonly RouteSpec[] = APP_ROUTES.map(({ id, path }) => ({ id, path, ...SHELLS[id] }))

export const HOME_ROUTE: RouteSpec = ROUTES[0]

export const htmlFileOf = (route: RouteSpec): string =>
  route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`

// Same file names as the markdown alternates the SPA points at after a navigation.
export const twinPathOf = (route: RouteSpec, locale: Locale): string => markdownTwinPath(route.path, locale)
