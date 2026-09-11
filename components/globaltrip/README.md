# Componentes del sitio principal GlobalTrip

Copiados del repositorio https://github.com/AlanTN13/globaltrip-react, commit `5116260` (11/09/2026). Se conserva el JSX, las clases, textos, idiomas y comportamiento de Header, Footer y NewsletterSignup. Los hashes de procedencia y la comprobación de igualdad están en `docs/evidence/brand/original-components.json`.

Adaptaciones de plataforma: límites `use client`; Link/useLocation adaptados a Next.js y enlaces absolutos al dominio principal; variables Vite renombradas a Next.js. Se mantienen traducciones/contexto y eventos originales. La carga de GTM no se agrega a esta preview.

El newsletter usa la misma URL pública que el sitio publicado mediante `NEXT_PUBLIC_GLOBALTRIP_NEWSLETTER_URL`, configurada solo para Preview en esta rama. Es independiente de las credenciales privadas del cotizador. No se hicieron suscripciones reales en las pruebas.

Las copias son una instantánea de esa versión del sitio, no una dependencia que se actualiza automáticamente. Al actualizar desde el origen, conservar estos adaptadores y verificar la interfaz.

## Estilos originales aislados (11/09/2026)

Compartir JSX no bastaba: el sitio principal usa Tailwind 4.1.18 y el cotizador usa Tailwind 3.4.18. Sus valores de sombras, radios, paleta, transformaciones y estilos base difieren. `styles/source/site-2026-09-11.css` conserva el CSS publicado en `https://globaltriplog.com/assets/index-CWDheoR7.css`.

`node scripts/sync-globaltrip-styles.cjs` extrae sus utilidades presentes en Header, Footer y NewsletterSignup, junto con el tema y los estilos base. Genera `styles/chrome.css`, limitado a los elementos con `data-globaltrip-chrome`. Las variables y la animación del spinner tienen un prefijo exclusivo para evitar interferencias con el formulario. El reset restaura el estilo original antes de aplicar estas utilidades. No se modifica la versión de Tailwind del cotizador.

`styles/fonts.css` usa los mismos WOFF2 Manrope v20 del sitio principal, almacenados en `public/brand`, con un nombre interno distinto para que no colisionen con las fuentes del formulario. Los pesos, caracteres y métricas coinciden. El contenedor `headerBoundary` reproduce el desplazamiento del header original sin modificar la posición del resumen del formulario.

Verificación: comparación de 29 propiedades de estilo por elemento en escritorio (1280px), móvil (390px), menú abierto y footer con imágenes cargadas y campo de email enfocado. Dimensiones, colores, sombras, radios y espaciados coinciden. No se enviaron suscripciones ni cotizaciones durante este cambio visual. Build correcto; 86 pruebas existentes pasaron y 2 siguen omitidas.
