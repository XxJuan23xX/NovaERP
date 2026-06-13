# ERP Web Backend - Módulo de Seguridad y Autenticación (RBAC)

¡Bienvenido al repositorio del backend de nuestro sistema ERP Web! Este sistema está siendo diseñado bajo una arquitectura desacoplada, donde el backend funciona estrictamente como una **API RESTful** construida con **Laravel**, utilizando **Microsoft SQL Server** como motor de base de datos relacional para garantizar la consistencia, integridad y seguridad de los datos de negocio.

---

## 🚀 Arquitectura General del Proyecto

El ERP está planificado para operar a través de 4 módulos core:
1. **Módulo 1: Inventario y Catálogo (El Corazón):** Control de mercancía, stock en tiempo real y proveedores.
2. **Módulo 2: Ventas y Punto de Venta (POS):** Interfaz operativa de cobro rápido, flujo de caja y tickets.
3. **Módulo 3: Usuarios, Roles y Seguridad (El Guardián) ➔ [COMPLETADO]:** Control de accesos y protección de datos.
4. **Módulo 4: Reportes y Dashboards (La Mente):** Gráficas de rendimiento y cálculo de ganancia neta.

---

## 🛡️ Estado Actual: Módulo 3 (Completado)

Hemos implementado con éxito la base de seguridad del sistema. Las características incluidas son:
* **Conexión Nativa a SQL Server (`sqlsrv`):** Estructura relacional sólida con migraciones preparadas.
* **Autenticación Segura mediante API:** Implementación de **Laravel Sanctum** para el manejo de sesiones protegidas por tokens (Bearer Tokens).
* **Control de Accesos Basado en Roles (RBAC):** * `admin`: Acceso total al ecosistema.
  * `empleado`: Acceso limitado (restringido a operaciones de caja y consulta).
* **Controladores API listos:** Registro de usuarios con encriptación de contraseñas (Bcrypt), Login (con limpieza de tokens antiguos) y Logout (revocación de tokens).

---

## 🛠️ Tecnologías Utilizadas

* **Backend:** Laravel 11+ / PHP 8.2+
* **Base de Datos:** Microsoft SQL Server (SSMS)
* **Autenticación:** Laravel Sanctum (Tokens API)
* **Pruebas de API:** Postman / Thunder Client

---

## ⚙️ Configuración e Instalación Local

Sigue estos pasos para levantar el entorno de desarrollo backend en tu máquina local:

### 1. Clonar el repositorio y entrar a la carpeta
```bash
git clone [https://github.com/TU_USUARIO/TU_REPOSITORIO.git](https://github.com/TU_USUARIO/TU_REPOSITORIO.git)
cd backend
