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

## 🌟 Gamificación y Retención (Cliente del Mes)
Se ha implementado una función automática para premiar al **Cliente Top #1** de cada mes. 
* El sistema calcula quién es el cliente con más citas/transacciones pagadas en los últimos 30 días.
* Al iniciar sesión, este cliente exclusivo recibe una notificación conmemorativa ("Cliente del Mes").
* Puede girar la **Ruleta de Premios** que, gracias a la integración con `canvas-confetti`, ofrece una experiencia premium al ganar. El premio se añade automáticamente a su cuenta en forma de cupón.

## 🛡️ Reglas de Negocio Específicas
* **Agendamiento:** Los roles `Barbero` y `Tatuador` **no pueden** agendar citas por sí mismos ni modificar/eliminar citas en el calendario. Solo tienen permisos de lectura sobre su propia agenda para ver lo que Caja o Administración les ha asignado.
* **Tatuajes:** Los servicios de Tatuajes son tratados con lógica especial ("A cotizar") ya que su precio final requiere evaluación en persona.

## 🚧 Estado Actual y Próximos Pasos (To-Do)

Nos encontramos en la fase final de despliegue y pulido del MVP:
1.  **Despliegue del Bot de WhatsApp:** Mudar la carpeta `panda-whatsapp-bot` a un servidor 24/7 (como **Railway**) y configurar variables de entorno para los mensajes automáticos y cuenta.
2.  **Prueba de Impresora Física:** Imprimir un recibo real en el local para verificar márgenes de 80mm.
3.  **Pulido de la Vista Pública:** Afinar las animaciones y la experiencia de usuario (UX) en la pantalla de "Agendar" para que el cliente final tenga un efecto "WOW".

---
*Este documento debe ser leído en su totalidad por cualquier IA asistente antes de proponer cambios arquitectónicos o de diseño.*
