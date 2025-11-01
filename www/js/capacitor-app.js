import { NotificationManager } from "./database/notifications.js";

var capacitorApp = {
  f7: null,
  /*
  This method hides splashscreen after 2 seconds
  */

  handleSplashscreen: function () {
    if (!window.Capacitor) return;
    setTimeout(() => {
      if (window.Capacitor.Plugins?.SplashScreen) {
        window.Capacitor.Plugins.SplashScreen.hide();
      }
    }, 2000);
  },
  checkCapacitorPlugins: function () {
    return {
      camera: !!window.Capacitor?.Plugins?.Camera,
      filesystem: !!window.Capacitor?.Plugins?.Filesystem,
      localNotifications: !!window.Capacitor?.Plugins?.LocalNotifications,
    };
  },

  /**
   * Selecciona una imagen desde la galería
   */
  selectImageFromGallery: async function () {
    if (!this.checkCapacitorPlugins().camera) {
      throw new Error("Camera plugin not available");
    }

    try {
      const image = await window.Capacitor.Plugins.Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: "uri",
        source: "PHOTOLIBRARY",
      });
      return image.webPath;
    } catch (error) {
      console.error("Error selecting image:", error);
      throw error;
    }
  },

  /**
   * Guarda una imagen en el filesystem
   */
  saveImageToFilesystem: async function (imageUri) {
    if (!this.checkCapacitorPlugins().filesystem) {
      throw new Error("Filesystem plugin not available");
    }

    try {
      const fileName = new Date().getTime() + ".jpeg";
      const base64Data = await this.readAsBase64(imageUri);

      const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: "DATA",
        recursive: true,
      });

      return window.Capacitor.convertFileSrc(savedFile.uri);
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  },

  /**
   * Función interna para convertir a base64
   */
  readAsBase64: function (imageUri) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.responseType = "blob";
      xhr.open("GET", imageUri, true);
      xhr.send(null);
    });
  },
  /**
   * Configura el canal de notificaciones
   */
  setupNotificationChannel: async function () {
    if (!window.Capacitor?.Plugins?.LocalNotifications) return;

    try {
      await window.Capacitor.Plugins.LocalNotifications.createChannel({
        id: "bizhome_channel",
        name: "Recordatorios BizHome",
        description: "Canal para recordatorios periódicos",
        importance: 4,
        visibility: 1,
        sound: "beep.mp3",
        vibration: true,
        iconColor: "#00bcd4",
        lights: true,
        lightColor: "#00bcd4",
      });
    } catch (error) {
      console.error("Error creating notification channel:", error);
    }
  },
  checkRequiredPlugins: function () {
    const requiredPlugins = [
      "CapacitorSQLite",
      "SplashScreen",
      "LocalNotifications",
      "Camera",
      "App", // Para manejar el botón de retroceso
      "StatusBar",
      "Keyboard",
    ];

    const missingPlugins = [];
    const availablePlugins = [];

    requiredPlugins.forEach((plugin) => {
      if (!window.Capacitor?.Plugins?.[plugin]) {
        missingPlugins.push(plugin);
      } else {
        availablePlugins.push(plugin);
      }
    });

    console.log("Plugins disponibles:", availablePlugins);
    console.log("Plugins faltantes:", missingPlugins);

    return {
      missing: missingPlugins,
      available: availablePlugins,
    };
  },
  checkAndRequestNotificationPermissions: async function () {
    if (!window.Capacitor?.Plugins?.LocalNotifications) {
      console.warn("LocalNotifications plugin not available");
      return false;
    }

    try {
      // 1. Verificar permisos de notificación
      const permissionStatus =
        await window.Capacitor.Plugins.LocalNotifications.checkPermissions();

      if (permissionStatus.display !== "granted") {
        const requestedStatus =
          await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        if (requestedStatus.display !== "granted") {
          this.f7.dialog.alert(
            "Los permisos para notificaciones no fueron concedidos",
            "Permisos requeridos"
          );
          return false;
        }
      }

      // 2. Verificar configuración de alarmas exactas (Android 12+)
      if (window.Capacitor.getPlatform() === "android") {
        const exactAlarmStatus =
          await window.Capacitor.Plugins.LocalNotifications.checkExactNotificationSetting();

        if (exactAlarmStatus.exact_alarm !== "granted") {
          this.f7.dialog.confirm(
            "Para notificaciones precisas, necesitas habilitar alarmas exactas en la configuración",
            "Configuración requerida",
            async () => {
              await window.Capacitor.Plugins.LocalNotifications.changeExactNotificationSetting();
            }
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error verificando permisos:", error);
      return false;
    }
  },
  schedulePeriodicNotifications: async function () {
    const f7 = this.f7;

    // Verificación básica del plugin
    if (!window.Capacitor?.Plugins?.LocalNotifications) {
      f7.dialog.alert(
        "El plugin de notificaciones no está disponible",
        "Error"
      );
      return;
    }

    try {
      // Mostrar progreso al usuario
      f7.preloader.show();
      const hasPermissions =
        await this.checkAndRequestNotificationPermissions();
      if (!hasPermissions) return;

      // 2. Definir horarios de notificaciones
      const now = new Date();
      const notifications = [
        {
          hour: 8,
          title: "☀️ Buenos días",
          message:
            "¡Buen día! Es hora de organizar tus actividades y revisar las metas del día.",
        },
        {
          hour: 10,
          title: "📦 Control mañana",
          message:
            "Revisa el inventario y prepara los productos más solicitados.",
        },
        {
          hour: 12,
          title: "🍽️ Corte de almuerzo",
          message: "Registra tus ventas matutinas antes de tu descanso.",
        },
        {
          hour: 16,
          title: "📊 Balance tarde",
          message:
            "Revisa cómo van las ventas y ajusta estrategias para la tarde.",
        },
        {
          hour: 20,
          title: "🏁 Inicio de cierre",
          message:
            "Comienza el proceso de cierre registrando tus últimas ventas.",
        },
        {
          hour: 22,
          title: "🌙 Buenas noches",
          message:
            "Cierre completo. ¡Buen trabajo hoy! Descansa para un nuevo día.",
        },
      ];

      // 3. Programar usando showNotification
      for (const notif of notifications) {
        const notificationTime = new Date();
        notificationTime.setHours(notif.hour, notif.minute || 0, 0, 0);

        if (notificationTime < now) {
          notificationTime.setDate(notificationTime.getDate() + 1);
        }

        await this.showNotification(
          notif.title,
          notif.message,
          notificationTime
        );
        console.log(
          `Programada: ${notif.title} a las ${notif.hour}:${
            notif.minute || "00"
          }`
        );
      }
    } catch (error) {
      console.error("Error:", error);
      f7.dialog.alert(
        `Error al programar notificaciones: ${
          error.message || "Error desconocido"
        }`,
        "Error"
      );
    } finally {
      f7.preloader.hide();
    }
  },

  // Función mejorada para probar notificación inmediata
  testNotificationNow: async function () {
    const f7 = this.f7;

    if (!window.Capacitor?.Plugins?.LocalNotifications) {
      f7.dialog.alert("Plugin de notificaciones no disponible", "Error");
      return;
    }

    try {
      f7.preloader.show();

      await window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            title: "PRUEBA INMEDIATA",
            body: "Esta notificación debería aparecer en 30 segundos",
            id: 9999,
            schedule: { at: new Date(Date.now() + 30000) },
            sound: "beep.mp3",
          },
        ],
      });

      f7.dialog.alert(
        "Notificación de prueba programada para mostrarse en 30 segundos",
        "Prueba exitosa"
      );
    } catch (error) {
      f7.dialog.alert(
        `Error en prueba: ${error.message || "Error desconocido"}`,
        "Error"
      );
    } finally {
      f7.preloader.hide();
    }
  },

  showNotification: async function (title, body, scheduleAt) {
    if (!window.Capacitor?.Plugins?.LocalNotifications) return;

    await window.Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [
        {
          title: title,
          body: body,
          id: Math.floor(Math.random() * 10000),
          schedule: { at: scheduleAt },
          sound: "beep.mp3",
          lightColor: "#00bcd4",
          vibrate: true,
          smallIcon: "ic_stat_icon_config",
          iconColor: "#00bcd4",
          extra: {
            expandable: true,
          },
          style: {
            type: "BIGTEXT",
            text: body,
            title: title,
            summary: "BizHome",
          },
        },
      ],
    });
  },
  getDeviceLicenseInfo: async function () {
    if (!window.Capacitor?.Plugins?.Device) return null;

    try {
      const deviceInfo = await window.Capacitor.Plugins.Device.getInfo();
      const deviceId = await window.Capacitor.Plugins.Device.getId();

      return {
        deviceId: deviceId.identifier,
        model: deviceInfo.model,
        platform: deviceInfo.platform,
        manufacturer: deviceInfo.manufacturer,
      };
    } catch (error) {
      console.error("Error getting device info:", error);
      throw error;
    }
  },

  /**
   * Genera un QR con los datos proporcionados
   */
  generateQR: async function (data) {
    try {
      // Verifica si QRCode está disponible (usando window.QRCode)
      if (typeof QRCode === "undefined") {
        throw new Error("QRCode library not available");
      }

      // Convertir a JSON string si es un objeto
      const qrData = typeof data === "object" ? JSON.stringify(data) : data;

      // Generar el QR usando la API basada en Promesas
      const qrCode = await new Promise((resolve, reject) => {
        QRCode.toDataURL(
          qrData,
          {
            width: 300,
            margin: 2,
            color: {
              dark: "#00bcd4", // Color azul para los puntos
              light: "#ffffff", // Fondo blanco
            },
          },
          (err, url) => {
            if (err) reject(err);
            else resolve(url);
          }
        );
      });

      return qrCode;
    } catch (error) {
      console.error("Error generating QR:", error);
      throw error;
    }
  },

  /**
   * Escanea un código QR
   */
  scanQR: async function () {
    if (!window.Capacitor?.Plugins?.BarcodeScanner) return null;

    try {
      await window.Capacitor.Plugins.BarcodeScanner.checkPermission({
        force: true,
      });
      window.Capacitor.Plugins.BarcodeScanner.hideBackground();

      const result = await window.Capacitor.Plugins.BarcodeScanner.startScan();
      return result.hasContent ? result.content : null;
    } finally {
      window.Capacitor.Plugins.BarcodeScanner.showBackground();
      window.Capacitor.Plugins.BarcodeScanner.stopScan();
    }
  },

  /**
   * Almacena una licencia
   */
  storeLicense: async function (license) {
    if (!window.Capacitor?.Plugins?.Preferences) return;

    await window.Capacitor.Plugins.Preferences.set({
      key: "bizhome_license",
      value: license,
    });
  },

  /**
   * Obtiene la licencia almacenada
   */
  getLicense: async function () {
    if (!window.Capacitor?.Plugins?.Preferences) return null;

    const { value } = await window.Capacitor.Plugins.Preferences.get({
      key: "bizhome_license",
    });
    return value;
  },

  disableNotifications: async function () {
    const f7 = this.f7;
    if (!window.Capacitor?.Plugins?.LocalNotifications) {
      f7.dialog.alert("LocalNotifications plugin not available");
      return;
    }
    try {
      // 1. Obtener todas las notificaciones pendientes
      const pending =
        await window.Capacitor.Plugins.LocalNotifications.getPending();

      // 2. Cancelar cada una individualmente
      if (pending.notifications.length > 0) {
        await window.Capacitor.Plugins.LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }

      // 3. Eliminar notificaciones mostradas
      const delivered =
        await window.Capacitor.Plugins.LocalNotifications.getDeliveredNotifications();
      if (delivered.notifications.length > 0) {
        await window.Capacitor.Plugins.LocalNotifications.removeDeliveredNotifications(
          {
            notifications: delivered.notifications.map((n) => ({ id: n.id })),
          }
        );
      }
      return true;
    } catch (error) {
      console.error("Error crítico al desactivar notificaciones:", error);
      f7.dialog.alert(
        `Error completo al cancelar notificaciones ${error}`,
        "Error crítico"
      );
      return false;
    }
  },

  initNotifications: async function () {
    if (!window.Capacitor?.Plugins?.LocalNotifications) {
      console.warn("LocalNotifications plugin not available");
      return;
    }

    try {
      const hasPermissions =
        await this.checkAndRequestNotificationPermissions();
      if (!hasPermissions) return;
      await window.Capacitor.Plugins.LocalNotifications.createChannel({
        id: "bizhome_channel",
        name: "Recordatorios BizHome",
        description: "Canal para recordatorios periódicos",
        importance: 4, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: "beep.mp3",
        vibration: true,
      });

      const isEnabled = await NotificationManager.getStatus();
      if (isEnabled) {
        const pending =
          await window.Capacitor.Plugins.LocalNotifications.getPending();
        if (pending.notifications.length === 0) {
          await this.schedulePeriodicNotifications();
        }
      }
    } catch (error) {
      console.error("Error inicializando notificaciones:", error);
    }
  },

handleAndroidBackButton: function () {
  const f7 = this.f7;
  if (!window.Capacitor?.Plugins?.App) return;

  // Variable para controlar el estado del diálogo
  let isDialogOpen = false;
  
  // Guardar el listener original si no existe
  if (!window.capacitorAppOriginalBackListener) {
    window.capacitorAppOriginalBackListener = (e) => {
      const currentPath = f7.views.current.router.url.split('?')[0];
      
      // Si ya hay un diálogo abierto, ignorar nuevos clicks
      if (isDialogOpen) return;
      
      // Comportamiento para la página de desbloqueo
      if (currentPath === '/unlock/') {
        isDialogOpen = true;
        f7.dialog.confirm(
          "¿Deseas salir de la aplicación?",
          "Confirmar",
          () => {
            isDialogOpen = false;
            window.Capacitor.Plugins.App.exitApp();
          },
          () => {
            isDialogOpen = false;
          }
        );
        return;
      }
      // Comportamiento especial para la página de licencia
      if (currentPath === '/licencia/') {
        isDialogOpen = true;
        f7.dialog.confirm(
          "¿Deseas salir de la aplicación?",
          "Confirmar",
          () => {
            isDialogOpen = false;
            window.Capacitor.Plugins.App.exitApp();
          },
          () => {
            isDialogOpen = false;
          }
        );
        return;
      }

      // Comportamiento normal para otras páginas
      if (f7.views.current.router.history.length > 1) {
        f7.views.current.router.back();
        return;
      }

      // Lógica de doble clic para salir
      let backButtonPressedTwice = false;

      if (backButtonPressedTwice) {
        window.Capacitor.Plugins.App.exitApp();
        return;
      }

      isDialogOpen = true;
      backButtonPressedTwice = true;

      f7.dialog.confirm(
        "¿Deseas salir de la aplicación?",
        "Confirmar",
        () => {
          isDialogOpen = false;
          window.Capacitor.Plugins.App.exitApp();
        },
        () => {
          isDialogOpen = false;
          backButtonPressedTwice = false;
        }
      );

      setTimeout(() => {
        backButtonPressedTwice = false;
      }, 2000);
    };

    // Registrar el listener
    window.Capacitor.Plugins.App.addListener('backButton', window.capacitorAppOriginalBackListener);
  }
},

  // Configurar status bar
  handleStatusBar: function () {
    if (window.Capacitor?.Plugins?.StatusBar) {
      window.Capacitor.Plugins.StatusBar.setStyle({ style: "DARK" });
      window.Capacitor.Plugins.StatusBar.setBackgroundColor({
        color: "#00bcd4", // Mismo color que el navbar para consistencia
      });
      // Añade este ajuste para iOS/Android:
      window.Capacitor.Plugins.StatusBar.setOverlaysWebView({ overlay: false });
    }
  },
  /*
  This method does the following:
    - provides cross-platform view "shrinking" on keyboard open/close
    - hides keyboard accessory bar for all inputs except where it required
  */
  handleKeyboard: function () {
    var f7 = capacitorApp.f7;
    if (!window.Capacitor || !window.Capacitor.Plugins.Keyboard) return;
    var $ = f7.$;
    var Keyboard = window.Capacitor.Plugins.Keyboard;
    if (!Keyboard) return;
    Keyboard.setResizeMode({ mode: "native" });
    Keyboard.setScroll({ isDisabled: true });
    Keyboard.setAccessoryBarVisible({ isVisible: false });
    window.addEventListener("keyboardWillShow", () => {
      f7.input.scrollIntoView(document.activeElement, 0, true, true);
    });
    window.addEventListener("keyboardDidShow", () => {
      f7.input.scrollIntoView(document.activeElement, 0, true, true);
    });
    window.addEventListener("keyboardDidHide", () => {
      if (
        document.activeElement &&
        $(document.activeElement).parents(".messagebar").length
      ) {
        return;
      }
      Keyboard.setAccessoryBarVisible({ isVisible: true });
    });

    $(document).on(
      "touchstart",
      "input, textarea, select",
      function (e) {
        var nodeName = e.target.nodeName.toLowerCase();
        var type = e.target.type;
        var showForTypes = ["datetime-local", "time", "date", "datetime"];
        if (nodeName === "select" || showForTypes.indexOf(type) >= 0) {
          Keyboard.setAccessoryBarVisible({ isVisible: true });
        } else {
          Keyboard.setAccessoryBarVisible({ isVisible: false });
        }
      },
      true
    );
  },
  initExpenseNotifications: async function () {
    if (!window.Capacitor?.Plugins?.Preferences) return;

    const today = new Date().toISOString().split("T")[0];
    const { value: lastDate } = await window.Capacitor.Plugins.Preferences.get({
      key: "lastExpenseLimitNotificationDate",
    });

    // Resetear si es un nuevo día
    if (lastDate && lastDate !== today) {
      await window.Capacitor.Plugins.Preferences.remove({
        key: "lastExpenseLimitNotificationDate",
      });
    }
  },

  /**
   * Verifica y programa notificación si se superó el límite
   */
  checkAndNotifyExpenseLimit: async function (currentTotal, dailyLimit) {
    if (
      !window.Capacitor?.Plugins?.LocalNotifications ||
      !window.Capacitor?.Plugins?.Preferences
    )
      return;

    // Solo actuar si se supera el límite
    if (currentTotal <= dailyLimit) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { value: lastNotifiedDate } =
        await window.Capacitor.Plugins.Preferences.get({
          key: "lastExpenseLimitNotificationDate",
        });

      // Si ya se notificó hoy, no hacer nada
      if (lastNotifiedDate === today) return;

      // Programar notificación para 30 minutos después
      await window.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            title: "⚠️ Límite de gastos excedido",
            body: "Has superado tu presupuesto diario. Revisa tus gastos.",
            id: 5000, // ID fijo
            schedule: { at: new Date(Date.now() + 1800000) }, // 30 minutos
            sound: "beep.mp3",
          },
        ],
      });

      // Registrar que ya se notificó hoy
      await window.Capacitor.Plugins.Preferences.set({
        key: "lastExpenseLimitNotificationDate",
        value: today,
      });
    } catch (error) {
      console.error("Error en checkAndNotifyExpenseLimit:", error);
    }
  },
  init: async function (f7) {
    // Save f7 instance
    capacitorApp.f7 = f7;

    if (window.Capacitor) {
      // Verificar plugins primero
      const pluginsCheck = this.checkRequiredPlugins();

      if (pluginsCheck.missing.length > 0) {
        f7.dialog.alert(
          `Los siguientes plugins requeridos no están disponibles:<br><br>- ${pluginsCheck.missing.join(
            "<br>- "
          )}<br><br>Algunas funcionalidades no trabajarán correctamente.`,
          "Plugins faltantes"
        );
      }

      this.handleSplashscreen();
      this.handleAndroidBackButton();
      this.handleKeyboard();
      this.handleStatusBar();
      await this.initNotifications();
      await this.initExpenseNotifications();
    }
  },
};

export default capacitorApp;
