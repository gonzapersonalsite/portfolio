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
        closeMenu: 'Close menu',
        menu: 'Menu',
        main: 'Main navigation',
      },
      home: {
        headline: 'Web, desktop and mobile apps, built end to end.',
        cta: 'View Projects',
        ctaContact: 'Contact',
        resume: 'Download CV',
        goblinLabel: 'A pixel goblin pulls a laptop from behind its back, codes for a while, looks around and runs off',
        goblinCaption: 'PixelGoblin · Hand-built SVG',
        focusAreas: 'Focus Areas',
        featuredLead:
          'A selection of what I have built. Switch any card between {{view}} and {{architecture}} to see how it is made.',
        viewAllCount: 'View All {{count}} Projects',
        aboutTitle: 'My Journey',
        contactEyebrow: 'Direct Contact',
        contactLead:
          'Looking for a Full Stack developer or want to discuss a project? Write to me by email or through the contact form.',
        contactCta: 'Open Contact Form',
      },
      about: {
        skills: 'Core Competencies',
        languages: 'Languages',
        more: 'More About Me',
        sentenceTitle: 'A Sentence That Defines Me',
      },
      skills: {
        heading: 'Technical Expertise',
        lead: 'Each technology comes with where I have used it: jobs, internships and my own projects.',
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
        lead: 'Development, platform and infrastructure, and technical support: what I did in each role and the technologies I used.',
      },
      projects: {
        heading: 'All Projects',
        lead: 'Web, desktop and mobile projects, each with its screenshots and its architecture. Filter by platform, or switch a card to {{architecture}} to see how it is built.',
        featured: 'Featured Projects',
        readMore: 'Read More',
        showLess: 'Show Less',
        featuredBadge: 'Featured project',
        filterAll: 'All',
        filterLabel: 'Filter by platform',
        viewModeLabel: 'Card display mode',
        viewTab: 'Preview',
        archTab: 'Architecture',
        specsTitle: 'Architecture Breakdown',
        openGalleryCta: 'View Screenshots ({{count}})',
        links: {
          site: 'Visit Site',
          download: 'Download',
          googlePlay: 'Google Play',
          microsoftStore: 'Microsoft Store',
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
        subtitle: 'Feel Free to Reach Out',
        heading: 'Get in Touch',
        description:
          'I am open to new professional opportunities. If you have a project or a job offer, I would love to hear from you.',
        email: 'Email',
        location: 'Location',
        social: 'Follow Me',
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
          title: 'No projects yet',
          description: 'Projects will appear here as soon as they are published.',
        },
        featured: {
          title: 'No featured projects yet',
          description: 'The full list is on the Projects page.',
        },
        experience: {
          title: 'No experience listed yet',
          description: 'Roles will appear here as soon as they are added.',
        },
        skills: {
          title: 'No skills listed yet',
          description: 'Skills will appear here as soon as they are added.',
        },
      },
      common: {
        present: 'Present',
        sending: 'Sending…',
        close: 'Close',
        openToWork: 'Open to work',
        skipToContent: 'Skip to main content',
        returnToTop: 'Return to top',
        languageGroup: 'Language',
        themeSwitchTo: 'Theme: {{current}}. Switch to {{next}}',
        animations: {
          pause: 'Pause animations',
          resume: 'Play animations',
          paused: 'Animations paused',
          pauseShort: 'Pause',
          resumeShort: 'Play',
          pausedShort: 'Paused',
          reducedSystem: 'Your system settings ask for reduced motion',
        },
        theme: {
          light: 'Light',
          dark: 'Dark',
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
        goblinLabel:
          'A lost pixel goblin walks in, paces around looking for the way out and runs off when a hand beckons from a portal',
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
        closeMenu: 'Cerrar menú',
        menu: 'Menú',
        main: 'Navegación principal',
      },
      home: {
        headline: 'Aplicaciones web, de escritorio y móviles, hechas de principio a fin.',
        cta: 'Ver proyectos',
        ctaContact: 'Contactar',
        resume: 'Descargar CV',
        goblinLabel:
          'Un duende pixelado saca un portátil de detrás de la espalda, programa un rato, mira a los lados y sale corriendo',
        goblinCaption: 'PixelGoblin · SVG artesanal',
        focusAreas: 'Áreas de trabajo',
        featuredLead:
          'Una selección de lo que he construido. Cambia cualquier tarjeta entre {{view}} y {{architecture}} para ver cómo está hecha.',
        viewAllCount: 'Ver los {{count}} proyectos',
        aboutTitle: 'Mi trayectoria',
        contactEyebrow: 'Contacto directo',
        contactLead:
          '¿Buscas un desarrollador Full Stack o quieres comentar un proyecto? Escríbeme por correo o desde el formulario de contacto.',
        contactCta: 'Abrir formulario de contacto',
      },
      about: {
        skills: 'Competencias principales',
        languages: 'Idiomas',
        more: 'Más sobre mí',
        sentenceTitle: 'Una frase que me define',
      },
      skills: {
        heading: 'Conocimientos técnicos',
        lead: 'Cada tecnología, con dónde la he usado: empleos, prácticas y proyectos propios.',
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
        lead: 'Desarrollo, plataforma e infraestructura, y soporte técnico: lo que hice en cada puesto y con qué tecnologías.',
      },
      projects: {
        heading: 'Todos los proyectos',
        lead: 'Proyectos web, de escritorio y móviles, cada uno con sus capturas y su arquitectura. Filtra por plataforma o cambia una tarjeta a {{architecture}} para ver cómo está hecho.',
        featured: 'Proyectos destacados',
        readMore: 'Leer más',
        showLess: 'Mostrar menos',
        featuredBadge: 'Proyecto destacado',
        filterAll: 'Todos',
        filterLabel: 'Filtrar por plataforma',
        viewModeLabel: 'Modo de vista de la tarjeta',
        viewTab: 'Vista',
        archTab: 'Arquitectura',
        specsTitle: 'Radiografía técnica',
        openGalleryCta: 'Ver capturas ({{count}})',
        links: {
          site: 'Visitar web',
          download: 'Descargar',
          googlePlay: 'Google Play',
          microsoftStore: 'Microsoft Store',
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
        social: 'Sígueme',
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
          title: 'Todavía no hay proyectos',
          description: 'Los proyectos aparecerán aquí en cuanto se publiquen.',
        },
        featured: {
          title: 'Todavía no hay proyectos destacados',
          description: 'La lista completa está en la página de proyectos.',
        },
        experience: {
          title: 'Todavía no hay experiencia publicada',
          description: 'Los puestos aparecerán aquí en cuanto se añadan.',
        },
        skills: {
          title: 'Todavía no hay habilidades publicadas',
          description: 'Las habilidades aparecerán aquí en cuanto se añadan.',
        },
      },
      common: {
        present: 'Actualidad',
        sending: 'Enviando…',
        close: 'Cerrar',
        openToWork: 'Disponible para trabajar',
        skipToContent: 'Saltar al contenido',
        returnToTop: 'Volver arriba',
        languageGroup: 'Idioma',
        themeSwitchTo: 'Tema: {{current}}. Cambiar a {{next}}',
        animations: {
          pause: 'Pausar animaciones',
          resume: 'Reanudar animaciones',
          paused: 'Animaciones pausadas',
          pauseShort: 'Pausar',
          resumeShort: 'Reanudar',
          pausedShort: 'Pausadas',
          reducedSystem: 'La configuración del sistema pide reducir el movimiento',
        },
        theme: {
          light: 'Claro',
          dark: 'Oscuro',
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
        goblinLabel:
          'Un duende pixelado perdido entra, da vueltas buscando la salida y sale corriendo cuando una mano le llama desde un portal',
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
