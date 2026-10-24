import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readStorage } from '@/shared/lib'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_QUERY_PARAM,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  resolveInitialLanguage,
  type Language,
} from './language'
import { pathnameLanguage } from './routes'

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        about: 'About',
        skills: 'Skills',
        experience: 'Experience',
        projects: 'Projects',
        contact: 'Contact',
        openMenu: 'Open menu',
        menu: 'Menu',
        main: 'Main navigation',
      },
      home: {
        cta: 'View Projects',
        resume: 'Download CV',
        goblinLabel: 'A pixel goblin pulls a laptop from behind its back, codes for a while, looks around and runs off',
        chips: {
          frontend: 'Frontend Developer',
          backend: 'Backend Architect',
          uiux: 'UI/UX Enthusiast',
          passion: '<Code /> with passion',
        },
      },
      about: {
        subtitle: 'WHO I AM',
        skills: 'Core Competencies',
        languages: 'Languages',
        more: 'More About Me',
        sentenceTitle: 'A sentence that defines me',
      },
      skills: {
        heading: 'Technical Expertise',
        categories: {
          Backend: 'Backend',
          Frontend: 'Frontend',
          Database: 'Databases',
          Tools: 'Tools',
          Other: 'Other',
          Mobile: 'Mobile',
          Desktop: 'Desktop',
        },
      },
      experience: {
        heading: 'Work History',
      },
      projects: {
        heading: 'All Projects',
        featured: 'Featured Projects',
        viewAll: 'View All',
        readMore: 'Read More',
        showLess: 'Show Less',
        featuredBadge: 'Featured project',
        links: {
          site: 'Visit Site',
          download: 'Download',
          googlePlay: 'Google Play',
          repository: 'Repository',
          documentation: 'Documentation',
        },
        openGallery: 'Open image gallery for {{title}}',
        gallery: {
          close: 'Close gallery',
          zoomIn: 'Zoom in',
          zoomOut: 'Zoom out',
          resetZoom: 'Reset zoom',
          previousImage: 'Previous image',
          nextImage: 'Next image',
          thumbnail: 'View image {{index}} of {{total}} ({{title}})',
          counter: 'Image {{index}} of {{total}}',
          viewer: 'Image viewer',
          loading: 'Loading image…',
          loaded: 'Image loaded.',
          loadError: 'This image could not be loaded.',
          retry: 'Try again',
        },
        types: {
          WEB: 'Web App',
          DESKTOP: 'Desktop App',
          MOBILE: 'Mobile App',
          OTHER: 'Other',
        },
      },
      contact: {
        subtitle: 'Feel free to reach out',
        heading: 'Get in Touch',
        description:
          'I am open to new professional opportunities. If you have a project or a job offer, I would love to hear from you.',
        email: 'Email',
        location: 'Location',
        social: 'FOLLOW ME',
        form: {
          name: 'Name',
          email: 'Email',
          message: 'Message',
          submit: 'Send Message',
          success: 'Message sent successfully!',
          required: 'This field is required.',
          invalidEmail: 'Enter a valid email address, for example name@example.com.',
          tooLong: 'Use {{max}} characters or fewer.',
          timeout:
            'The form did not answer in time, and your message may have been sent anyway. To avoid a duplicate, please email me directly at {{email}} instead of resending it.',
          unavailable: 'The contact form is not available right now. Please email me directly at {{email}}.',
          sendFailed: 'Your message could not be sent. Please try again or email me directly at {{email}}.',
        },
      },
      emptyState: {
        projects: {
          title: 'Building the Future',
          description: 'No projects here yet, but great things are in the making.',
        },
        featured: {
          title: 'Highlights Coming Soon',
          description: 'Curating the best projects to showcase here.',
        },
        experience: {
          title: 'The Journey Begins',
          description: 'Every expert was once a beginner. My professional path starts here.',
        },
        skills: {
          title: 'Unlocking Potential',
          description: 'Skills are being honed and added. Stay tuned for updates.',
        },
      },
      common: {
        present: 'Present',
        sending: 'Sending...',
        close: 'Close',
        openToWork: 'Open to work',
        skipToContent: 'Skip to main content',
        returnToTop: 'Return to top',
        languageButton: 'Language: {{name}} ({{code}})',
        themeButton: 'Theme: {{mode}}',
        animations: {
          label: 'Animations',
          enabled: 'Enabled',
          paused: 'Paused',
          reducedSystem: 'Disabled by system preference',
        },
        theme: {
          light: 'Light',
          dark: 'Dark',
          glass: 'Liquid Glass',
        },
        errorBoundaryTitle: 'Something went wrong',
        errorBoundaryDescription: 'An unexpected error occurred. Please try refreshing the page.',
        errorBoundaryRefresh: 'Refresh Page',
        errorBoundaryHome: 'Go to Home Page',
      },
      footer: {
        rights: 'All rights reserved.',
      },
      notFound: {
        badge: 'HTTP 404 · ROUTE_NOT_FOUND',
        heading: 'Page Not Found',
        description: 'The route you are looking for does not exist or has moved to another corner of the codebase.',
        terminalTitle: 'gonzalo@portfolio: ~ (bash)',
        terminalOutput: 'No such file or directory (HTTP 404)',
        terminalHint: 'Type "help" to list commands ("cd ~", "cd projects", "ls"...) or use the buttons below.',
        terminalInputLabel: 'Terminal command input',
        terminalPlaceholder: 'help, ls, cd ~, cd projects...',
        terminalHelp:
          'Available commands: help · ls · pwd · whoami · clear · cd ~ · cd projects · cd about · cd skills · cd experience · cd contact',
        terminalLs: 'home/  about/  skills/  experience/  projects/  contact/',
        terminalWhoami: 'gonzalo — Full Stack Developer (React · TypeScript · Spring Boot · .NET · Flutter)',
        terminalUnknown: 'bash: {{cmd}}: command not found — type "help" for available commands.',
        backHome: 'Back to Home',
        viewProjects: 'View Projects',
      },
      seo: {
        home: {
          title: 'Gonzalo Martínez | Full Stack Developer',
          description:
            'Portfolio of Gonzalo Martínez, Full Stack Developer in Palma de Mallorca, Spain: web, desktop and mobile apps with React, TypeScript, Spring Boot, .NET and Flutter.',
        },
        about: {
          title: 'About Me | Gonzalo Martínez',
          description:
            'Learn about Gonzalo Martínez, a Full Stack Developer based in Palma de Mallorca, Spain: his journey, philosophy, skills and professional background.',
        },
        skills: {
          title: 'Skills | Gonzalo Martínez',
          description:
            'Explore the technical skills of Gonzalo Martínez, a Full Stack Developer working with React, TypeScript, Java and Spring Boot, plus .NET, Flutter and Kotlin for desktop and mobile.',
        },
        experience: {
          title: 'Experience | Gonzalo Martínez',
          description:
            'Professional experience of Gonzalo Martínez, Full Stack Developer: microservices with Java Spring Boot and React, IAM, CI/CD and on-premise infrastructure.',
        },
        projects: {
          title: 'Projects | Gonzalo Martínez',
          description:
            'Browse portfolio projects by Gonzalo Martínez, showcasing web, desktop and mobile applications built with React, TypeScript, .NET and Flutter.',
        },
        contact: {
          title: 'Contact | Gonzalo Martínez',
          description:
            'Get in touch with Gonzalo Martínez for professional opportunities, collaborations, or project inquiries. Based in Palma de Mallorca, Spain.',
        },
        notFound: {
          title: 'Page Not Found | Gonzalo Martínez',
          description: 'The page you are looking for does not exist in Gonzalo Martínez’s portfolio.',
        },
      },
    },
  },
  es: {
    translation: {
      nav: {
        home: 'Inicio',
        about: 'Sobre mí',
        skills: 'Habilidades',
        experience: 'Experiencia',
        projects: 'Proyectos',
        contact: 'Contacto',
        openMenu: 'Abrir menú',
        menu: 'Menú',
        main: 'Navegación principal',
      },
      home: {
        cta: 'Ver proyectos',
        resume: 'Descargar CV',
        goblinLabel:
          'Un duende pixelado saca un portátil de detrás de la espalda, programa un rato, mira a los lados y sale corriendo',
        chips: {
          frontend: 'Desarrollador Frontend',
          backend: 'Arquitecto Backend',
          uiux: 'Entusiasta UI/UX',
          passion: '<Código /> con pasión',
        },
      },
      about: {
        subtitle: 'QUIÉN SOY',
        skills: 'Competencias principales',
        languages: 'Idiomas',
        more: 'Más sobre mí',
        sentenceTitle: 'Una frase que me define',
      },
      skills: {
        heading: 'Conocimientos técnicos',
        categories: {
          Backend: 'Backend',
          Frontend: 'Frontend',
          Database: 'Bases de datos',
          Tools: 'Herramientas',
          Other: 'Otros',
          Mobile: 'Móvil',
          Desktop: 'Escritorio',
        },
      },
      experience: {
        heading: 'Historial laboral',
      },
      projects: {
        heading: 'Todos los proyectos',
        featured: 'Proyectos destacados',
        viewAll: 'Ver todos',
        readMore: 'Leer más',
        showLess: 'Mostrar menos',
        featuredBadge: 'Proyecto destacado',
        links: {
          site: 'Visitar web',
          download: 'Descargar',
          googlePlay: 'Google Play',
          repository: 'Repositorio',
          documentation: 'Documentación',
        },
        openGallery: 'Abrir galería de imágenes de {{title}}',
        gallery: {
          close: 'Cerrar galería',
          zoomIn: 'Acercar',
          zoomOut: 'Alejar',
          resetZoom: 'Restablecer zoom',
          previousImage: 'Imagen anterior',
          nextImage: 'Imagen siguiente',
          thumbnail: 'Ver imagen {{index}} de {{total}} ({{title}})',
          counter: 'Imagen {{index}} de {{total}}',
          viewer: 'Visor de imágenes',
          loading: 'Cargando imagen…',
          loaded: 'Imagen cargada.',
          loadError: 'No se ha podido cargar esta imagen.',
          retry: 'Reintentar',
        },
        types: {
          WEB: 'App web',
          DESKTOP: 'App de escritorio',
          MOBILE: 'App móvil',
          OTHER: 'Otro',
        },
      },
      contact: {
        subtitle: 'No dudes en escribirme',
        heading: 'Ponte en contacto',
        description:
          'Estoy abierto a nuevas oportunidades profesionales. Si tienes un proyecto o una oferta de trabajo, me encantaría escucharte.',
        email: 'Correo',
        location: 'Ubicación',
        social: 'SÍGUEME',
        form: {
          name: 'Nombre',
          email: 'Correo',
          message: 'Mensaje',
          submit: 'Enviar mensaje',
          success: '¡Mensaje enviado con éxito!',
          required: 'Este campo es obligatorio.',
          invalidEmail: 'Introduce un correo electrónico válido, por ejemplo nombre@ejemplo.com.',
          tooLong: 'Usa {{max}} caracteres como máximo.',
          timeout:
            'El formulario no ha respondido a tiempo y puede que el mensaje se haya enviado igualmente. Para no duplicarlo, escríbeme directamente a {{email}} en lugar de volver a enviarlo.',
          unavailable:
            'El formulario de contacto no está disponible en este momento. Escríbeme directamente a {{email}}.',
          sendFailed: 'No se ha podido enviar el mensaje. Inténtalo de nuevo o escríbeme directamente a {{email}}.',
        },
      },
      emptyState: {
        projects: {
          title: 'Construyendo el futuro',
          description: 'Aún no hay proyectos aquí, pero grandes cosas se están gestando.',
        },
        featured: {
          title: 'Destacados próximamente',
          description: 'Seleccionando los mejores proyectos para mostrar aquí.',
        },
        experience: {
          title: 'El viaje comienza',
          description: 'Todo experto fue una vez principiante. Mi trayectoria profesional empieza aquí.',
        },
        skills: {
          title: 'Desbloqueando potencial',
          description: 'Las habilidades se están perfeccionando y añadiendo. Mantente al tanto.',
        },
      },
      common: {
        present: 'Actualidad',
        sending: 'Enviando...',
        close: 'Cerrar',
        openToWork: 'Disponible para trabajar',
        skipToContent: 'Saltar al contenido',
        returnToTop: 'Volver arriba',
        languageButton: 'Idioma: {{name}} ({{code}})',
        themeButton: 'Tema: {{mode}}',
        animations: {
          label: 'Animaciones',
          enabled: 'Activadas',
          paused: 'Pausadas',
          reducedSystem: 'Desactivadas por el sistema',
        },
        theme: {
          light: 'Claro',
          dark: 'Oscuro',
          glass: 'Liquid Glass',
        },
        errorBoundaryTitle: 'Algo ha ido mal',
        errorBoundaryDescription: 'Se ha producido un error inesperado. Prueba a recargar la página.',
        errorBoundaryRefresh: 'Recargar página',
        errorBoundaryHome: 'Ir a la página de inicio',
      },
      footer: {
        rights: 'Todos los derechos reservados.',
      },
      notFound: {
        badge: 'HTTP 404 · RUTA_NO_ENCONTRADA',
        heading: 'Página no encontrada',
        description: 'La ruta que buscas no existe o se ha movido a otro rincón del código.',
        terminalTitle: 'gonzalo@portfolio: ~ (bash)',
        terminalOutput: 'No existe el fichero o el directorio (HTTP 404)',
        terminalHint: 'Escribe "help" para ver los comandos ("cd ~", "cd projects", "ls"...) o usa los botones.',
        terminalInputLabel: 'Entrada de comandos de la terminal',
        terminalPlaceholder: 'help, ls, cd ~, cd projects...',
        terminalHelp:
          'Comandos disponibles: help · ls · pwd · whoami · clear · cd ~ · cd projects · cd about · cd skills · cd experience · cd contact',
        terminalLs: 'home/  about/  skills/  experience/  projects/  contact/',
        terminalWhoami: 'gonzalo — Desarrollador Full Stack (React · TypeScript · Spring Boot · .NET · Flutter)',
        terminalUnknown: 'bash: {{cmd}}: orden no encontrada — escribe "help" para ver los comandos disponibles.',
        backHome: 'Volver al inicio',
        viewProjects: 'Ver proyectos',
      },
      seo: {
        home: {
          title: 'Gonzalo Martínez | Desarrollador Full Stack',
          description:
            'Portafolio de Gonzalo Martínez, desarrollador Full Stack en Palma de Mallorca, España: aplicaciones web, de escritorio y móviles con React, TypeScript, Spring Boot, .NET y Flutter.',
        },
        about: {
          title: 'Sobre mí | Gonzalo Martínez',
          description:
            'Conoce a Gonzalo Martínez, desarrollador Full Stack en Palma de Mallorca, España: su trayectoria, filosofía, habilidades y experiencia profesional.',
        },
        skills: {
          title: 'Habilidades | Gonzalo Martínez',
          description:
            'Explora las habilidades técnicas de Gonzalo Martínez, desarrollador Full Stack que trabaja con React, TypeScript, Java y Spring Boot, además de .NET, Flutter y Kotlin para escritorio y móvil.',
        },
        experience: {
          title: 'Experiencia | Gonzalo Martínez',
          description:
            'Experiencia profesional de Gonzalo Martínez, desarrollador Full Stack: microservicios con Java Spring Boot y React, IAM, CI/CD e infraestructura on-premise.',
        },
        projects: {
          title: 'Proyectos | Gonzalo Martínez',
          description:
            'Explora los proyectos de Gonzalo Martínez, que muestran aplicaciones web, de escritorio y móviles construidas con React, TypeScript, .NET y Flutter.',
        },
        contact: {
          title: 'Contacto | Gonzalo Martínez',
          description:
            'Ponte en contacto con Gonzalo Martínez para oportunidades profesionales, colaboraciones o consultas sobre proyectos. En Palma de Mallorca, España.',
        },
        notFound: {
          title: 'Página no encontrada | Gonzalo Martínez',
          description: 'La página que buscas no existe en el portafolio de Gonzalo Martínez.',
        },
      },
    },
  },
}

const getInitialLanguage = (): Language =>
  resolveInitialLanguage({
    path: pathnameLanguage(window.location.pathname),
    query: new URLSearchParams(window.location.search).get(LANGUAGE_QUERY_PARAM),
    stored: readStorage(LANGUAGE_STORAGE_KEY),
    browser: navigator.language,
  })

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  supportedLngs: SUPPORTED_LANGUAGES,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
