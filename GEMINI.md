# Diseño y UX/UI - Sistema de Reservas

Este documento sirve como espacio de trabajo para la revisión, auditoría y mejora del diseño y la experiencia de usuario (UX/UI) del proyecto.

> **Nota:** El enfoque es estrictamente visual y de experiencia de usuario. La lógica de negocio y backend se mantiene fuera de este alcance.

## 🎨 Sistema de Diseño y Recursos

**Librerías Principales (Mandatorias):**
1.  **shadcn/ui:** [Documentación](https://ui.shadcn.com/docs/components)
    - Base estructural para todos los componentes interactivos estándar (Botones, Inputs, Sheets, Dialogs).
    - Mantener la consistencia con el tema `zinc` actual.

2.  **Aceternity UI:** [Componentes](https://ui.aceternity.com/components)
    - Utilizar para elementos de "alto impacto" visual (Hero sections, Features, Grids animados).
    - Ideal para dar el toque "Luxe" que busca el proyecto.

3.  **Tailwind CSS v4:**
    - Utilizar para layout y utilidades generales.
    - Aprovechar el motor optimizado y las nuevas variables CSS nativas.

**Tipografía:**
- Sans: `Geist Sans`
- Mono: `Geist Mono`
- Serif: `Playfair Display`

**Colores (Theme: Luxe SaaS):**
- **Background:** Zinc/Slate muy claro (Light) o muy oscuro (Dark)
- **Primary:** Contraste alto.
- **Estilo:** Minimalista, "Glassmorphism".

## 🗺️ Mapa de Sitios a Revisar

### 1. Marketing (Público)
- [ ] **Landing Page** (`app/(marketing)/page.tsx`): Primera impresión. Debe convertir.
- [ ] **Pricing** (`app/(marketing)/pricing/page.tsx`): Tabla de precios clara y atractiva.
- [ ] **Login/Signup** (`app/(marketing)/login`, `/signup`): Flujos de entrada sin fricción.

### 2. Flujo de Reserva (Cliente Final)
- [ ] **Perfil del Negocio** (`app/[slug]/page.tsx`): ¿Se ve profesional? ¿Es fácil entender qué hacen?
- [ ] **Selección de Servicio** (`app/[slug]/booking/[serviceId]`): Claridad en opciones.
- [ ] **Selección de Extras** (`.../addons`): Upselling efectivo pero no intrusivo.
- [ ] **Confirmación** (`.../confirm`): Resumen claro antes del compromiso.

### 3. Dashboard (Dueño del Negocio)
- [ ] **Overview** (`app/dashboard/page.tsx`): Métricas clave de un vistazo.
- [ ] **Calendario** (`app/dashboard/calendar`): Usabilidad de la agenda (drag & drop, visualización).
- [ ] **Servicios & Configuración**: Formularios y tablas fáciles de gestionar.

## 📝 Notas de Auditoría y Propuestas

### Auditoría: Landing Page (Marketing)

**Estado Actual:**
- ✅ **Estilo Visual:** Moderno, utiliza "noise textures" y gradientes sutiles que elevan la calidad percibida.
- ✅ **Hero Section:** Excelente uso de interactividad con `HeroAnimation`. Comunica el valor del producto (simplicidad) sin palabras.
- ✅ **Tipografía:** Balanceada, buen uso de `text-balance` para titulares.
- ⚠️ **Navegación Móvil:** El layout (`app/(marketing)/layout.tsx`) oculta el botón de "Comenzar Gratis" en móviles, pero los enlaces de texto ("Precios", "Ingresar") permanecen visibles. **Falta un menú hamburguesa** para una mejor experiencia en pantallas pequeñas.
- ⚠️ **Accesibilidad:** La animación del Hero es puramente visual. Debería tener `aria-hidden="true"` para lectores de pantalla.

**Propuestas de Mejora:**

1.  **Implementar Menú Móvil:**
    - Agregar un componente `MobileNav` usando `Sheet` de shadcn/ui.
    - Ocultar enlaces de texto en mobile y moverlos dentro del Sheet.

2.  **Refinar Social Proof:**
    - Reemplazar los nombres de empresas en texto por logotipos SVG monocromáticos para mayor credibilidad.

3.  **Micro-interacciones:**
    - Agregar `hover:scale-105` o transiciones suaves a los botones de CTA principales para hacerlos más "clicables".

### Auditoría: Flujo de Reserva (Booking Flow)

**Estado Actual:**
- ✅ **Arquitectura:** Excelente separación de layouts para Móvil y Desktop. Prioriza la experiencia en dispositivos pequeños (donde ocurre la mayoría de las reservas).
- ✅ **UX Móvil:** Uso consistente de botones "sticky" en la parte inferior, facilitando la acción con el pulgar.
- ✅ **Claridad:** Desglose de precios y tiempos claro en cada paso. Evita sorpresas.
- ✅ **Feedback:** Buenos estados de carga y selección (checkmarks, anillos de foco).
- ⚠️ **Validación:** La validación de formularios (Nombre/Teléfono) en la página de confirmación parece ocurrir solo al intentar enviar. Sería mejor dar feedback en tiempo real o usar máscaras de input para el teléfono.
- ⚠️ **Performance Perpercibida:** Se usa un spinner (`Loader2`) centrado para la carga de datos inicial. Implementar **Skeleton Screens** haría que la carga se sienta más rápida y fluida.

**Propuestas de Mejora:**

1.  **Skeleton Loading:**
    - Reemplazar el spinner de carga completa por un esqueleto de la tarjeta de servicio y los slots de tiempo.

2.  **Mejora de Inputs:**
    - Agregar validación visual simple (borde rojo/verde) en los campos de Nombre y Teléfono.

3.  **Navegación de Calendario:**
    - En mobile, los botones de "mes anterior/siguiente" son funcionales pero podrían ser más grandes o estar mejor integrados para evitar toques accidentales.

### Auditoría: Dashboard (Dueño del Negocio)

**Estado Actual:**
- ✅ **Navegación:** Sidebar personalizado con buena gestión de estado móvil. Íconos claros.
- ✅ **Gestión de Servicios:** Funcionalidad avanzada (Image Cropper, Modal de edición) que supera el estándar de un MVP.
- ✅ **Calendario:** Implementación robusta de `FullCalendar` con estilos sobrescritos para coincidir con el tema (Tailwind).
- ✅ **Responsividad:** El calendario cambia inteligentemente a `listWeek` en móviles, evitando la frustración de rejillas mensuales comprimidas.
- ⚠️ **Accesibilidad en Modales:** Los modales personalizados (en Servicios) podrían necesitar mejoras de foco (Focus Trap) y cierre con tecla `Escape` para cumplir con estándares WCAG.
- ⚠️ **Hardcoded Colors:** Los colores de estado en el calendario están "hardcoded" en hexadecimal. Sería ideal usar variables CSS o un mapa de colores centralizado para facilitar el cambio de temas.

**Propuestas de Mejora:**

1.  **Refactor de Colores:**
    - Mover los códigos de color del calendario a una constante o usar las variables de Tailwind para mantener la consistencia del tema (especialmente para Dark Mode).

2.  **Mejora de Modales:**
    - Utilizar el componente `Dialog` de shadcn/ui en lugar del modal personalizado actual para ganar accesibilidad y animaciones estándar de forma gratuita.

3.  **Empty States:**
    - En la vista de lista del calendario (Móvil), asegurar que el mensaje de "No hay citas" sea amigable y quizás ofrezca una acción (ej. "Crear cita manual").

### Auditoría: Autenticación (Login/Signup)

**Estado Actual:**
- ✅ **Layout:** Diseño de "pantalla partida" (Split Screen) clásico y efectivo. La columna visual refuerza la marca y la prueba social.
- ✅ **UX de Registro:** Wizard de 2 pasos. Reduce la carga cognitiva al pedir datos del negocio solo después de asegurar las credenciales.
- ✅ **Micro-interacciones:** Generación automática del "slug" (URL) basada en el nombre del negocio. Un detalle excelente que ahorra tiempo al usuario.
- ✅ **Feedback:** Estados de carga claros en los botones primarios.
- ⚠️ **Móvil:** En pantallas pequeñas, la columna visual desaparece, dejando solo el formulario. Falta un ancla visual de marca (Logo) en la parte superior del formulario móvil para dar confianza.

**Propuestas de Mejora:**

1.  **Logo en Móvil:**
    - Agregar el logo de la marca en la parte superior del formulario (`md:hidden`) para que la experiencia móvil no se sienta "huérfana".

2.  **Social Login:**
    - El diseño está listo para botones de "Continuar con Google", pero no están implementados en el frontend actual.

### Plan de Implementación Inmediato

Basado en la auditoría completa, la prioridad #1 es la **Navegación Móvil en la Landing Page**.

1.  Crear componente `MobileNav` en `components/marketing/mobile-nav.tsx`.
2.  Integrar `Sheet` de shadcn/ui.
3.  Actualizar `app/(marketing)/layout.tsx` para incluir el menú móvil.

¿Procedo con este plan?
