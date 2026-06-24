# Panda Barber CRM - Project Handoff & Context Document

Este documento sirve como la "Biblia" del proyecto **Panda Barber CRM**. Está diseñado para que cualquier IA o desarrollador pueda entender al instante el contexto del negocio, las reglas de desarrollo, la arquitectura y el estado actual.

> [!IMPORTANT]
> **REGLA DE ORO PARA LA IA:** Nunca trabajes directamente sobre la rama `main` (o `master`). Siempre debes crear una nueva rama para cualquier funcionalidad o arreglo (Ejemplo: `git checkout -b feature/nueva-ruleta` o `git checkout -b fix/error-caja`). Al terminar, pide confirmación antes de hacer merge.

## 📖 Contexto del Negocio y Diseño (UX/UI)

**Panda Barber Studio** no es una barbería común; es un espacio premium. Por lo tanto, el software debe reflejar esa exclusividad.
*   **Estética:** Se utiliza un diseño oscuro (*Dark Mode* por defecto) con acentos dorados (`#D4AF37`) y blancos.
*   **Componentes:** Uso intensivo de *Glassmorphism* (fondos semi-transparentes con desenfoque/blur), bordes redondeados y micro-animaciones (fade-ins, scale-ins). **PROHIBIDO** hacer diseños planos o aburridos.
*   **Experiencia:** Todo debe sentirse fluido, tipo aplicación móvil, evitando recargas de página innecesarias.

## 🛠️ Stack Tecnológico

*   **Frontend Web:** React 18, Vite, React Router DOM, Lucide React (para iconos de alta calidad).
*   **Estilos:** CSS Vanilla puro, utilizando variables dinámicas en `index.css`. No se usa Tailwind ni Bootstrap para mantener un control milimétrico del glassmorphism.
*   **Backend / Base de Datos:** Supabase (PostgreSQL), aprovechando el cliente JS para consultas directas y *Realtime* cuando sea necesario.
*   **Bot de WhatsApp:** Node.js, `whatsapp-web.js`, `node-cron`. El bot es un microservicio que vive en una carpeta independiente (`panda-whatsapp-bot`) y se lee directamente de la base de datos de Supabase.

## 🏗️ Arquitectura General

El ecosistema se divide en 3 grandes bloques:
1.  **Dashboard Admin / POS (Punto de Venta):** La herramienta interna. Permite gestionar clientes, servicios, inventario (productos y extras), personal (con múltiples roles) y procesar pagos complejos.
2.  **Portal del Cliente (Booking):** (Ruta: `/#/agendar`). El portal público donde los clientes eligen servicios, seleccionan a su barbero favorito, reservan fechas y pueden ganar premios.
3.  **Microservicio de WhatsApp:** Script de Node.js en la nube que notifica de forma autónoma.

## 🌿 Ramas de Desarrollo

| Rama | Descripción | Estado |
|------|-------------|--------|
| `main` | Producción estable | Solo merge desde `rama-funciones` |
| `rama-funciones` | Funcionalidades core del CRM | ✅ Activa (último merge: `c44eda8`) |
| `rama-diseno` | Diseño UI/UX (trabajo de diseño externo) | ✅ Mergeada en `rama-funciones` |

> **Flujo de trabajo:** Todo se desarrolla en `rama-funciones`. El diseño externo se integra vía merge desde `rama-diseno`.

## ✅ Características Implementadas (Core Features)

### 1. POS Avanzado y Caja Mixta (`CheckoutPOS.jsx`)
*   Soporte para pagos bi-moneda simultáneos: **Dólares (Efectivo/Zelle)** y **Bolívares (Pago Móvil/Punto)**.
*   Tasa de cambio manual (fijada por el cajero al inicio del día).
*   El cajero puede cobrar servicios, productos del inventario y "Extras" (ej. lavado) en la misma factura.
*   Impresión térmica: Botón para imprimir ticket físico en impresoras de 80mm usando `window.print()` y reglas CSS de `@media print`.

### 2. Sistema de Comisiones Complejo
*   Las comisiones se dividen dinámicamente según el rol.
*   Un **Barbero** gana un % sobre el corte (usualmente 40%).
*   Un **Asistente de Lavado** gana una tarifa plana por cada cliente que pasa por el lavacabezas. El sistema deduce el costo del lavado antes de calcular la comisión del barbero.
*   Comisiones por venta de productos de inventario (10%).

### 3. Gamificación: Ruleta y Cupones
*   Los clientes que ingresan al link de reserva el día de su cumpleaños son recibidos por una Ruleta animada.
*   Los premios de la ruleta se configuran desde el panel de Admin.
*   Al ganar, se genera un cupón en la DB (`client_coupons`) que aparece automáticamente como descuento cuando el cajero les va a cobrar.

### 4. Automatización con WhatsApp
*   El CRM tiene plantillas configurables (en la tabla `system_settings`).
*   El Bot de Node.js se despierta diariamente, lee las plantillas, busca cumpleañeros y personas que se cortaron el cabello hace X días, y les escribe automáticamente ofreciendo el enlace de reservas.

### 5. Servicios de Tatuajes (Flujo Especial)
*   **Detección automática:** Los servicios de tatuaje se detectan por el nombre de la categoría (contiene "tatuaj"). No se usa campo `is_tattoo`.
*   **Precios:** Los servicios de tatuaje muestran "A cotizar" en lugar de precio numérico. Se guarda `price: 0` en la DB.
*   **Comisiones dinámicas:** Las etiquetas cambian automáticamente:
  *   "Comisión Barbero" → "Comisión Tatuador"
  *   "Pago Real Barbero" → "Pago Real Tatuador"
*   **Filtrado de personal:** El select de personal en agendamiento se filtra dinámicamente:
  *   Servicios de barbería → solo muestra staff con `position` = "Barbero" o "Asistente"
  *   Servicios de tatuaje → solo muestra staff con `position` = "Tatuador"
*   **Flujo de reserva (BookAppointment.jsx):**
  *   Servicios normales: pasos de Fecha → Hora → Bebida → Confirmar
  *   Servicios de tatuaje: pasos de Fecha → Hora → Referencia → Confirmar
  *   Paso de **Referencia**: textarea para describir el tatuaje + nota indicando que las fotos se envían por WhatsApp
  *   Al confirmar: redirige a `wa.me/{numero_negocio}` con mensaje pre-formateado (sin emojis)

### 6. Configuración del Negocio (`SettingsModule.jsx`)
*   **Pestaña WhatsApp:**
  *   Campo para número de WhatsApp del negocio (se guarda en `system_settings` como `whatsapp_business_number`)
  *   Plantillas de mensajes configurables (cumpleaños, seguimiento) con placeholder `{{nombre}}`
*   **Pestaña Cupones:**
  *   Gestión completa de cupones emitidos con filtros y búsqueda
  *   Plantillas de descuento configurables
*   **Pestaña Ruleta:**
  *   Configuración de premios de la ruleta de cumpleaños
*   **Arreglo de tabs:** Se corrigió bug donde el contenido de una pestaña aparecía en otra. Ahora cada pestaña usa condicionales `&&` independientes en lugar de ternarios encadenados.

### 7. Reservas Públicas (`BookAppointment.jsx`)
*   Flujo completo de reserva con selección de servicio, staff, fecha y hora.
*   **Detección dinámica de tatuajes:** Filtra personal según el servicio seleccionado.
*   **Referencia para tatuajes:** Paso especial para describir el diseño deseado.
*   **Redirección a WhatsApp:** Al confirmar, abre `wa.me` con mensaje formateado para que el cliente envíe sus fotos directamente.
*   **Número dinámico:** Lee el número de WhatsApp del negocio desde la DB (`publicService.getWhatsAppNumber()`).

## 🌟 Gamificación y Retención (Cliente del Mes)
Se ha implementado una función automática para premiar al **Cliente Top #1** de cada mes.
* El sistema calcula quién es el cliente con más citas/transacciones pagadas en los últimos 30 días.
* Al iniciar sesión, este cliente exclusivo recibe una notificación conmemorativa ("Cliente del Mes").
* Puede girar la **Ruleta de Premios** que, gracias a la integración con `canvas-confetti`, ofrece una experiencia premium al ganar. El premio se añade automáticamente a su cuenta en forma de cupón.

## 🛡️ Reglas de Negocio Específicas
* **Agendamiento:** Los roles `Barbero` y `Tatuador` **no pueden** agendar citas por sí mismos ni modificar/eliminar citas en el calendario. Solo tienen permisos de lectura sobre su propia agenda para ver lo que Caja o Administración les ha asignado.
* **Tatuajes:** Los servicios de Tatuajes son tratados con lógica especial ("A cotizar") ya que su precio final requiere evaluación en persona. El flujo de reserva redirige a WhatsApp para que el cliente envíe fotos de referencia directamente.
* **Categorías de Servicios:** Las categorías deben ser únicas. El `dataService.js` aplica deduplicación por nombre para evitar duplicados en la UI.

## 🚧 Estado Actual y Próximos Pasos (To-Do)

Nos encontramos en la fase final de despliegue y pulido del MVP:

### Completado ✅
- [x] Servicios de tatuajes con flujo especial (detectar por categoría, "A cotizar", comisiones dinámicas)
- [x] Redirección a WhatsApp para tatuajes (wa.me con mensaje pre-formateado)
- [x] Número de WhatsApp configurable desde Settings
- [x] Eliminación de funcionalidad de cierre semanal automático
- [x] Merge del diseño externo (rama-diseno → rama-funciones)
- [x] Fix de tabs en SettingsModule (cupones, ruleta, WhatsApp independientes)
- [x] Deduplicación de categorías en dataService.js

### Pendiente 🔲
1. **Despliegue del Bot de WhatsApp:** Crear microservicio `panda-whatsapp-bot` con Node.js + whatsapp-web.js + node-cron. Ver prompt generado para la implementación completa.
2. **Fix de 404 en `/#/agendar`:** Error de routing post-merge que impide acceder al portal de reservas.
3. **Prueba de Impresora Física:** Imprimir un recibo real en el local para verificar márgenes de 80mm.
4. **Pulido de la Vista Pública:** Afinar las animaciones y la experiencia de usuario (UX) en la pantalla de "Agendar" para que el cliente final tenga un efecto "WOW".
5. **Actualizar `whatsapp_business_number`** en la tabla `system_settings` de Supabase con el número correcto del negocio.

## 📁 Archivos Clave por Módulo

| Archivo | Descripción |
|---------|-------------|
| `src/App.jsx` | Router principal, carga de datos, verificación de cumpleaños |
| `src/components/CheckoutPOS.jsx` | Punto de venta, pagos mixtos, impresión de tickets |
| `src/components/ServicesModule.jsx` | CRUD servicios, detección de tatuajes, comisiones dinámicas |
| `src/components/SettingsModule.jsx` | Configuración: WhatsApp, cupones, ruleta, personal |
| `src/components/FinanceModule.jsx` | Dashboard financiero, reportes |
| `src/public-site/pages/BookAppointment.jsx` | Reserva pública, flujo de tatuajes, redirección WhatsApp |
| `src/public-site/services/publicService.js` | API pública: servicios, staff, WhatsApp number |
| `src/services/dataService.js` | API principal, CRUD, deduplicación de categorías |
| `src/contexts/AuthContext.jsx` | Autenticación, roles, permisos |
| `PROJECT_HANDOFF.md` | Este documento |

---
*Este documento debe ser leído en su totalidad por cualquier IA asistente antes de proponer cambios arquitectónicos o de diseño.*

*Última actualización: 24 de Junio 2026*
