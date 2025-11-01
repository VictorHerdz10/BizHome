# BizHome - Gestión de Negocios y Hogar

<div align="center">

![BizHome Logo](https://img.shields.io/badge/BizHome-0.1.1-00bcd4)
![Plataforma](https://img.shields.io/badge/Plataforma-Android-blue)
![Framework](https://img.shields.io/badge/Framework-Framework7%208-ff69b4)
![Capacitor](https://img.shields.io/badge/Runtime-Capacitor%207-1199ff)

**Una aplicación móvil integral para gestión de pequeños negocios y control de gastos domésticos**

[Características](#-características) • [Instalación](#-instalación) • [Tecnologías](#-tecnologías) • [Desarrollo](#-desarrollo)

</div>

## 📋 Descripción del Proyecto

BizHome es una aplicación móvil completa construida con tecnologías web modernas y empaquetada como aplicación nativa Android usando Capacitor. Proporciona a pequeños empresarios y emprendedores herramientas para gestionar inventario, ventas, finanzas y gastos del hogar en una plataforma integrada.

## 🚀 Características

### 🏪 Gestión de Negocios
- **📦 Control de Inventario** - Gestión completa de productos con categorías, precios y control de stock
- **💰 Gestión de Ventas** - Registro de transacciones con cálculo automático de ganancias y retención de impuestos
- **📊 Dashboard Analítico** - Gráficos interactivos y métricas de rendimiento empresarial
- **🏷️ Sistema de Categorías** - Organización flexible de productos

### 🏠 Gestión del Hogar
- **💸 Seguimiento de Gastos** - Registro diario de gastos con categorización
- **🎯 Controles de Presupuesto** - Límites de gasto diarios/semanales/mensuales configurables
- **📈 Reportes Financieros** - Tendencias de gastos y herramientas de análisis
- **📅 Filtrado por Fechas** - Visualización flexible por períodos

### 🔒 Seguridad y Configuración
- **🔐 Bloqueo de App** - Protección por PIN/Contraseña con soporte biométrico
- **📜 Sistema de Licencias** - Activación de licencia por dispositivo
- **🌙 Modo Oscuro** - Temas de UI adaptables
- **🧾 Funciones Tributarias** - Cálculos automáticos de retención de impuestos
- **🔔 Notificaciones** - Alertas locales y recordatorios

## 🛠 Tecnologías Utilizadas

### Framework Principal
- **Framework7 Core v8.3.4** - Framework para aplicaciones web progresivas
- **Capacitor v7.4.2** - Runtime multiplataforma nativo
- **Plataforma Android** - Despliegue móvil nativo

### Base de Datos y Almacenamiento
- **@capacitor-community/sqlite v7.0.1** - Base de datos SQLite local
- **Capacitor Preferences** - Almacenamiento persistente de configuración
- **Capacitor Filesystem** - Gestión de archivos e imágenes

### UI y Estilos
- **Framework7 Icons v5.0.5** - Conjunto de iconos de UI
- **Material Icons v1.13.14** - Iconos de Google Material Design
- **Skeleton Elements v4.0.1** - Placeholders de carga
- **Swiper v11.2.10** - Sliders y carruseles táctiles

### Visualización de Datos y Utilidades
- **Chart.js** - Gráficos interactivos
- **Generador de QR** - Códigos QR para licencias y datos
- **CryptoJS v4.2.0** - Encriptación de datos y seguridad
- **Dom7 v4.0.6** - Biblioteca de manipulación DOM

### Funciones Nativas
- **API de Cámara** - Captura de imágenes de productos
- **Notificaciones Locales** - Alertas en la aplicación
- **Información del Dispositivo** - Identificación de hardware
- **Barra de Estado y Pantalla de Inicio** - Integración de UI nativa

## 📥 Instalación

### Prerrequisitos
- **Node.js** 16.x o superior
- **npm** 8.x o superior
- **Android Studio** (para builds Android)
- **Java JDK** 11 o superior

### Inicio Rápido
```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd app-framework7

# Instalar dependencias
npm install

# Agregar plataforma Android
npx cap add android

# Iniciar servidor de desarrollo
npm start
```

### Comandos de Desarrollo
```bash
npm start              # Iniciar servidor de desarrollo
npm run serve          # Servidor de desarrollo alternativo
npm run build-capacitor-android  # Build para Android
npx cap run android    # Ejecutar en dispositivo/emulador Android
```

## 🔧 Configuración

### Configuración del Entorno
1. Asegurar que Android Studio esté instalado y configurado
2. Configurar Android SDK y herramientas de build
3. Configurar variables de entorno de Java
4. Habilitar opciones de desarrollador en dispositivo Android

### Generación de Assets
```bash
# Generar iconos de app y pantallas de inicio
framework7 assets

# Generar assets específicos para Capacitor
npx cordova-res
```

### Proceso de Build
```bash
# Build de assets web y sincronización con Android
npm run build-capacitor-android

# Abrir en Android Studio para personalización
npx cap open android
```

## 📁 Estructura del Proyecto

```
app-framework7/
├── www/                 # Assets web
│   ├── assets/         # Imágenes, fuentes, archivos estáticos
│   ├── framework7/     # Archivos de la librería Framework7
│   └── fonts/          # Fuentes de iconos
├── android/            # Proyecto de plataforma Android
├── resources/          # Iconos de app y pantallas de inicio
└── assets-src/         # Assets fuente para generación
```

## 🎯 Páginas y Módulos Principales

- **Dashboard** (`dashboard.html`) - Vista general del negocio con gráficos
- **Productos** (`products.html`) - Gestión de inventario
- **Categorías** (`categories.html`) - Categorización de productos
- **Ventas** (`sales.html`) - Transacciones y reportes de ventas
- **Gastos** (`expenses.html`) - Seguimiento de gastos del hogar
- **Seguridad** (`seguridad.html`) - Configuración de bloqueo de app
- **Licencia** (`license-check.html`) - Activación de licencia
- **Configuración** (`config.html`) - Configuración de la aplicación

## 🔐 Implementación de Seguridad

- **Encriptación de Datos** - Encriptación de datos sensibles usando CryptoJS
- **Licencias por Dispositivo** - Validación de licencia basada en hardware
- **Bloqueo de App** - Protección configurable por PIN/contraseña
- **Almacenamiento Seguro** - Almacenamiento de base de datos local encriptada

## 📊 Esquema de Base de Datos

La aplicación usa SQLite con tablas para:
- Products (ítems de inventario)
- Categories (clasificación de productos)
- Sales (registros de transacciones)
- Expenses (gastos del hogar)
- Settings (configuración de aplicación)
- Security (datos de autenticación)

## 🚀 Despliegue

### Generación de APK Android
```bash
# Construir la aplicación
npm run build-capacitor-android

# Generar APK de release en Android Studio
npx cap open android
# Luego: Build → Generate Signed Bundle / APK
```

### Lista de Verificación para Release
- [ ] Probar todas las funcionalidades principales
- [ ] Verificar proceso de activación de licencia
- [ ] Validar características de seguridad
- [ ] Probar en múltiples versiones de Android
- [ ] Verificar permisos de notificaciones
- [ ] Comprobar funcionalidad de cámara

## 🤝 Contribución

### Configuración de Desarrollo
1. Hacer fork del repositorio
2. Crear una rama de feature
3. Realizar cambios y probar exhaustivamente
4. Enviar pull request

### Estándares de Código
- Seguir mejores prácticas de Framework7
- Mantener estilo de código consistente
- Agregar comentarios para lógica compleja
- Probar en múltiples tamaños de pantalla

## 📞 Soporte y Contacto

**Desarrollador**: Víctor Hernández  
**Email**: victorhernandezsalcedo4@gmail.com  
**Teléfono**: +53 59157423  

## 📄 Licencia

Este proyecto requiere licencia específica por dispositivo. Para información de licencias y uso comercial, por favor contactar al desarrollador.

---

<div align="center">

**BizHome** - *Gestionando tu negocio y hogar, simplificado*

*Construido con ❤️ usando Framework7 & Capacitor*

</div>

---