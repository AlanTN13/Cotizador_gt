# Componentes del sitio principal GlobalTrip

Copiados del repositorio https://github.com/AlanTN13/globaltrip-react, commit `5116260` (11/09/2026). Se conserva el JSX, las clases, textos, idiomas y comportamiento de Header, Footer y NewsletterSignup. Los hashes de procedencia y la comprobación de igualdad están en `docs/evidence/brand/original-components.json`.

Adaptaciones de plataforma: límites `use client`; Link/useLocation adaptados a Next.js y enlaces absolutos al dominio principal; variables Vite renombradas a Next.js. Se mantienen traducciones/contexto y eventos originales. La carga de GTM no se agrega a esta preview.

El newsletter usa la misma URL pública que el sitio publicado mediante `NEXT_PUBLIC_GLOBALTRIP_NEWSLETTER_URL`, configurada solo para Preview en esta rama. Es independiente de las credenciales privadas del cotizador. No se hicieron suscripciones reales en las pruebas.

Las copias son una instantánea de esa versión del sitio, no una dependencia que se actualiza automáticamente. Al actualizar desde el origen, conservar estos adaptadores y verificar la interfaz.
