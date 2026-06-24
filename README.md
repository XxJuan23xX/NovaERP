# 🌟 NovaERP - Sistema de Planificación de Recursos Empresariales

¡Bienvenido a **NovaERP**! Un sistema de gestión empresarial (ERP) moderno, robusto y desacoplado, diseñado para optimizar las operaciones de catálogo, inventario, punto de venta (POS), CRM de clientes, cotizaciones y auditoría de seguridad en tiempo real.

El proyecto está diseñado bajo una arquitectura de software limpia y moderna: un **Backend API RESTful** construido con **Laravel** utilizando **Microsoft SQL Server** como motor de datos relacional para garantizar la máxima integridad y consistencia empresarial, y un **Frontend SPA** interactivo desarrollado con **React.js**, **Vite** y **Tailwind CSS** en **Modo Claro (Light Mode)**.

---

## 🚀 Arquitectura General y Módulos Core

El sistema NovaERP se ha consolidado al 100% con la implementación completa de sus 4 módulos estratégicos:

### 📦 Módulo 1: Inventario y Catálogo (El Corazón) — `[COMPLETADO]`
*   **Catálogo Maestro de Productos**: Registro detallado de productos con marca, categoría, unidad de medida, stock mínimo y control de visibilidad de costos.
*   **Gestión Multialmacén**: Soporte para múltiples bodegas o sucursales físicas (ej. *Almacén Central*, *Sucursal Norte*).
*   **Kardex y Control de Movimientos (Regla de Oro)**: Historial inmutable de ingresos, egresos y ajustes manuales de stock auditables.
*   **Traspasos entre Sucursales en Dos Fases**: Flujo seguro de envío (solicitud *En Tránsito*) y recepción (confirmación física que actualiza stocks de forma transaccional en SQL Server).

### 🛒 Módulo 2: Ventas y Punto de Venta (POS) — `[COMPLETADO]`
*   **Punto de Venta Interactivo**: Carrito de compras reactivo con buscador inteligente y control de existencias en tiempo real por almacén.
*   **Apertura y Asignación de Turnos**: Bloqueo inteligente del POS que exige una sesión de caja activa con fondo inicial antes de realizar ventas.
*   **Integración de Clientes y CRM**: Asociación rápida de clientes a tickets, con validación visual en tiempo real de su estado de facturación fiscal (RFC, Régimen y Código Postal).
*   **Generador Consecutivo de Folios**: Lógica secuencial segura para la asignación de números de ticket (`V-XXXXX`).

### 🛡️ Módulo 3: Usuarios, Roles y Seguridad (El Guardián) — `[COMPLETADO]`
*   **Control de Accesos Basado en Roles (RBAC)**:
    *   `admin`: Supervisor general con acceso total a KPIs, bitácoras de auditoría, edición de catálogos y gestión de personal.
    *   `empleado`: Cajero u operador con acceso limitado a operaciones de POS, cotizaciones y consultas del catálogo de productos en solo lectura.
*   **Restricción de Datos Críticos**: Ocultamiento dinámico del `precio_compra` a nivel de respuesta API (Eloquent Resource) si el token pertenece a un rol de empleado.
*   **Sesiones Protegidas**: Autenticación centralizada mediante tokens Bearer con **Laravel Sanctum**.

### 📊 Módulo 4: Reportes y Dashboards (La Mente) — `[COMPLETADO]`
*   **Métricas Financieras Ejecutivas (KPIs)**: Indicadores clave de ventas del día, cantidad de tickets emitidos, ticket promedio de compra y conteo de clientes activos con porcentajes de variación respecto al día anterior.
*   **Gráfica de Ventas Semanales**: Trazado SVG nativo interactivo con interpolación de curvas Bézier cúbicas (Catmull-Rom), tooltips flotantes en hover y animación de trazado progresivo.
*   **Gráfica de Categorías**: Donut SVG reactivo con espaciado de 5px entre segmentos, leyenda dinámica de porcentajes y animación de trazado secuencial por categoría.
*   **Cierre de Caja y Arqueo Diario**: Formulario de cuadratura que calcula el descuadre con el efectivo real contado, desglose de facturación por cajero, impresión de ticket y exportación en formato CSV.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Backend** | PHP 8.2+ & Laravel 11 | API RESTful y lógica de negocio. |
| **Base de Datos** | Microsoft SQL Server (SSMS) | Persistencia de datos y transaccionalidad. |
| **Frontend** | React.js 18 & Vite | SPA responsiva y reactividad. |
| **Estilos** | Tailwind CSS & Vanilla CSS | Interfaz corporativa limpia en Modo Claro. |
| **Autenticación** | Laravel Sanctum | Bearer Tokens para sesiones seguras. |

---

## 📂 Estructura del Repositorio

El proyecto está organizado en dos carpetas principales desacopladas:

```text
NovaERP/
├── backend/            # Código fuente del Backend (Laravel)
│   ├── app/            # Modelos, Controladores y Servicios
│   ├── database/       # Migraciones y Seeders de SQL Server
│   └── routes/         # Definición de Endpoints de la API
├── frontend/           # Código fuente del Frontend (React + Vite)
│   ├── src/
│   │   ├── components/ # Componentes de UI reutilizables
│   │   ├── context/    # Manejo del estado global de autenticación
│   │   ├── pages/      # Páginas de la aplicación (Dashboard, POS, Inventario, etc.)
│   │   └── services/   # Configuración de Axios para peticiones API
└── README.md           # Guía general de inicio rápido
```

---

## ⚙️ Configuración e Instalación Local

Sigue los siguientes pasos para levantar ambos entornos de desarrollo localmente:

### 1. Requisitos Previos
*   **PHP 8.2 o superior** con las extensiones `sqlsrv` y `pdo_sqlsrv` habilitadas en tu `php.ini`.
*   **Composer** instalado globalmente.
*   **Node.js 18 o superior** y gestor de paquetes **npm**.
*   **Microsoft SQL Server** local o remoto con una base de datos vacía llamada `NovaERP`.

---

### 2. Configuración del Backend (Laravel)

1.  Navega al directorio del backend:
    ```bash
    cd backend
    ```
2.  Instala las dependencias del framework:
    ```bash
    composer install
    ```
3.  Crea tu archivo de entorno a partir de la plantilla:
    ```bash
    cp .env.example .env
    ```
4.  Configura tus variables de conexión de base de datos en el archivo `.env`:
    ```env
    DB_CONNECTION=sqlsrv
    DB_HOST=127.0.0.1
    DB_PORT=1433
    DB_DATABASE=NovaERP
    DB_USERNAME=tu_usuario_sql
    DB_PASSWORD=tu_contrasena_sql
    ```
5.  Genera la clave de la aplicación:
    ```bash
    php artisan key:generate
    ```
6.  Ejecuta las migraciones y puebla la base de datos con los seeders de prueba:
    ```bash
    php artisan migrate --seed
    ```
7.  Inicia el servidor local de desarrollo:
    ```bash
    php artisan serve
    ```
    La API estará disponible en `http://127.0.0.1:8000`.

---

### 3. Configuración del Frontend (React + Vite)

1.  Navega al directorio del frontend:
    ```bash
    cd ../frontend
    ```
2.  Instala las dependencias de Node:
    ```bash
    npm install
    ```
3.  Asegúrate de que la URL base de tu API en `src/services/api.js` apunte al servidor local del backend:
    ```javascript
    const API_URL = "http://127.0.0.1:8000/api";
    ```
4.  Inicia el servidor de desarrollo de Vite:
    ```bash
    npm run dev
    ```
    La aplicación se abrirá localmente en `http://localhost:5173`.

---
CONTROL DE VERSIONES:
VERSIÓN ACTUAL: 1.0.0

## 🔐 Credenciales de Acceso por Defecto (Seeders)

Los seeders crean cuentas de prueba con roles específicos para evaluar el comportamiento del sistema:

*   **Administrador (Acceso Completo):**
    *   **Email:** `admin@novaerp.com`
    *   **Contraseña:** `admin123`
*   **Empleado / Cajero (Acceso Restringido):**
    *   **Email:** `empleado@novaerp.com`
    *   **Contraseña:** `empleado123`
