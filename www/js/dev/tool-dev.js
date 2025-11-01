// tool-dev.js
import capacitorApp from "../capacitor-app.js";

// Configuración de licencia
const SECRET_KEY = "BizHome_Secret_2025!";

export const ToolsDev = {
  app: null,
  scannerActive: false,
  currentDeviceData: null,

  /**
   * Inicializa las herramientas de desarrollo
   * @param {Object} appPrincipal - Instancia principal de la aplicación
   */
  initToolsDev: function (appPrincipal) {
    this.app = appPrincipal;

    // Configurar estado inicial del modo desarrollador
    const devModeEnabled = localStorage.getItem("devModeEnabled") === "true";
    const devModeToggle = document.getElementById("dev-mode-toggle");
    const devToolsLink = document.getElementById("dev-tools-link");

    if (devModeToggle) {
      devModeToggle.checked = devModeEnabled;
    }

    if (devToolsLink) {
      devToolsLink.style.display = devModeEnabled ? "block" : "none";
    }

    // Registrar métodos globales
    this.registerGlobalMethods();
  },

  /**
   * Registra métodos globales para ser accesibles desde el HTML
   */
  registerGlobalMethods: function () {
    // Métodos de licencia
    window.generateDeviceQR = () => this.generateDeviceQR();
    window.activateLicense = () => this.activateLicense();
    window.checkLicenseStatus = () => this.checkLicenseStatus();
    window.copyQRImage = () => this.copyQRImage();
    window.copyDeviceData = () => this.copyDeviceData();
    window.generateLicenseHash = () => this.generateLicenseHash();
    window.copyToClipboard = (id) => this.copyToClipboard(id);

    // Métodos de notificaciones
    window.forceNotificationTest = () => this.forceNotificationTest();
    window.sendCustomNotification = () => this.sendCustomNotification();
    window.toggleDevMode = (e) => this.toggleDevMode(e);
    window.generateDevToolsQR = () => this.generateDevToolsQR();
    window.copyDevToolsQRImage = () => this.copyDevToolsQRImage();
  },
  async generateDevToolsQR() {
    try {
      // Mostrar spinner mientras se carga
      const spinner = this.app.dialog.progress("Generando QR...");

      let deviceData = await capacitorApp.getDeviceLicenseInfo();

      // Datos mock para desarrollo en navegador
      if (!deviceData && !window.Capacitor) {
        deviceData = {
          deviceId: "dev-mock-" + Math.random().toString(36).substr(2, 9),
          model: "Browser Dev",
          platform: "web",
          manufacturer: "Dev Machine",
        };
      }

      if (!deviceData) {
        throw new Error("No se pudieron obtener datos del dispositivo");
      }

      // Datos para el QR
      const qrData = {
        deviceId: deviceData.deviceId,
        model: deviceData.model,
        platform: deviceData.platform,
        manufacturer: deviceData.manufacturer,
      };

      this.currentDeviceData = qrData;
      const dataStr = JSON.stringify(qrData);
      const qrCode = await capacitorApp.generateQR(dataStr);

      // Actualizar el contenedor específico del popup
      const qrContainer = document.getElementById("qr-license-container-dev");

      if (qrContainer) {
        qrContainer.innerHTML = `
        <div style="position: relative;">
          <img id="dev-tools-qr-image" src="${qrCode}" style="max-width: 250px; border: 1px solid #eee; border-radius: 8px;">
        </div>`;
      }

      spinner.close();

      // Abrir el popup automáticamente después de generar el QR
      this.app.popup.open("#device-qr-popup");
    } catch (error) {
      if (this.app.dialog) {
        this.app.dialog.alert("Error generando QR: " + error.message);
      }
      console.error("Error generating dev tools QR:", error);
    }
  },

  /**
   * Genera un QR con los datos del dispositivo
   */
  async generateDeviceQR() {
    try {
      let deviceData = await capacitorApp.getDeviceLicenseInfo();

      // Datos mock para desarrollo en navegador
      if (!deviceData && !window.Capacitor) {
        deviceData = {
          deviceId: "dev-mock-" + Math.random().toString(36).substr(2, 9),
          model: "Browser Dev",
          platform: "web",
          manufacturer: "Dev Machine",
        };
      }

      if (!deviceData) {
        throw new Error("No se pudieron obtener datos del dispositivo");
      }

      // Solo incluir datos inmutables en el QR
      const qrData = {
        deviceId: deviceData.deviceId,
        model: deviceData.model,
        platform: deviceData.platform,
        manufacturer: deviceData.manufacturer,
      };

      this.currentDeviceData = qrData;
      const dataStr = JSON.stringify(qrData);
      const qrCode = await capacitorApp.generateQR(dataStr);

      const qrContainer = document.getElementById("qr-license-container");
      qrContainer.innerHTML = `
    <div style="position: relative;">
      <img id="qr-image" src="${qrCode}" style="max-width: 250px; border: 1px solid #eee; border-radius: 8px;">
    </div>`;

      // Mostrar el contenedor de no licencia
      document.getElementById("no-license-container").style.display = "flex";
      document.getElementById("verifying-container").style.display = "none";
    } catch (error) {
      this.app.dialog.alert("Error generando QR: " + error.message);
      // Mostrar contenedor de error si es necesario
      document.getElementById("no-license-container").style.display = "flex";
      document.getElementById("verifying-container").style.display = "none";
    }
  },

  /**
   * Copia la imagen QR al portapapeles
   */
  async copyQRImage() {
    try {
      const qrImage = document.getElementById("qr-image");
      if (!qrImage) throw new Error("No hay imagen QR para copiar");

      // Solución moderna
      if (navigator.clipboard && window.ClipboardItem) {
        const response = await fetch(qrImage.src);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      }
      // Solución alternativa
      else {
        const link = document.createElement("a");
        link.href = qrImage.src;
        link.download = "device-data-qr.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      this.app.toast
        .create({
          text: "Imagen QR copiada",
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    } catch (error) {
      this.app.dialog.alert("Error copiando QR: " + error.message);
    }
  },
  async copyDevToolsQRImage() {
    try {
      const qrImage = document.getElementById("dev-tools-qr-image");
      if (!qrImage) throw new Error("No hay imagen QR para copiar");

      if (navigator.clipboard && window.ClipboardItem) {
        const response = await fetch(qrImage.src);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
      } else {
        const link = document.createElement("a");
        link.href = qrImage.src;
        link.download = "device-data-qr-dev-tools.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      this.app.toast
        .create({
          text: "Imagen QR copiada",
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    } catch (error) {
      this.app.dialog.alert("Error copiando QR: " + error.message);
    }
  },

  /**
   * Copia los datos del dispositivo al portapapeles
   */
  copyDeviceData() {
    if (!this.currentDeviceData) {
      this.app.dialog.alert("No hay datos para copiar");
      return;
    }

    const dataStr = JSON.stringify(this.currentDeviceData, null, 2);
    navigator.clipboard
      .writeText(dataStr)
      .then(() => {
        this.app.toast
          .create({
            text: "Datos copiados al portapapeles",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      })
      .catch((err) => {
        this.app.dialog.alert("Error al copiar: " + err.message);
      });
  },

  /**
   * Genera un hash de licencia a partir de los datos del dispositivo
   */
  generateLicenseHash() {
    this.app.dialog.prompt(
      "Ingrese meses de validez para la licencia (1-36):",
      "Validez de la Licencia",
      async (value) => {
        try {
          const dataInput = document
            .getElementById("license-data-input")
            .value.trim();
          if (!dataInput) {
            throw new Error(
              "Ingrese los datos del dispositivo en formato JSON"
            );
          }

          // Validar JSON y deviceId
          const deviceData = JSON.parse(dataInput);
          if (!deviceData.deviceId) {
            throw new Error("El formato debe incluir un deviceId válido");
          }

          // Validar meses
          if (!value || isNaN(value)) {
            throw new Error("Ingrese un número válido entre 1-36");
          }

          const validityMonths = parseInt(value);
          if (validityMonths < 1 || validityMonths > 36) {
            throw new Error("El rango permitido es de 1 a 36 meses");
          }

          // Generar licencia
          const expirationDate = new Date();
          expirationDate.setMonth(expirationDate.getMonth() + validityMonths);

          const licenseData = {
            ...deviceData,
            validUntil: expirationDate.getTime(),
            generatedAt: new Date().getTime(),
            validityMonths: validityMonths,
          };

          const licenseHash = CryptoJS.AES.encrypt(
            JSON.stringify(licenseData),
            SECRET_KEY
          ).toString();

          // Mostrar resultado
          document.getElementById("license-hash-output").value = licenseHash;
          document.getElementById("hash-result-container").style.display =
            "block";
          document.getElementById("license-data-input").value = "";
          this.app.toast
            .create({
              text: `Licencia generada para ${validityMonths} meses`,
              position: "center",
              closeTimeout: 2000,
            })
            .open();
        } catch (error) {
          this.app.dialog.alert(error.message);
        }
      },
      () => {
        this.app.toast
          .create({
            text: "Operación cancelada",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      },
      "6"
    );
  },

  async activateLicense() {
    const licenseHash = document
      .getElementById("license-hash-input")
      .value.trim();

    if (!licenseHash) {
      this.app.dialog.alert("Ingrese el hash de licencia");
      return;
    }

    try {
      // Verificación adicional de formato básico del hash
      if (!/^[A-Za-z0-9+/=]+$/.test(licenseHash)) {
        throw new Error("Formato de hash inválido");
      }

      const decrypted = this.verifyLicense(licenseHash);
      if (!decrypted) return;

      const currentDevice = await capacitorApp.getDeviceLicenseInfo();
      if (!currentDevice?.deviceId) {
        throw new Error("No se pudo identificar el dispositivo");
      }

      if (decrypted.deviceId !== currentDevice.deviceId) {
        throw new Error(
          `La licencia no es valida para a este dispositivo. Por Favor verifique su licencia`
        );
      }

      await capacitorApp.storeLicense(licenseHash);
      this.app.dialog.alert(
        "Licencia activada hasta: " +
          new Date(decrypted.validUntil).toLocaleDateString(),
        "Licencia válida",
        () => {
          // Redirigir a home después de cerrar el diálogo
          this.app.views.main.router.navigate("/", {
            clearPreviousHistory: true,
          });
        }
      );
      this.app.popup.close("#activate-license-popup");
    } catch (error) {
      this.app.dialog.alert(error.message);
    }
  },

  verifyLicense(licenseHash) {
    try {
      if (typeof licenseHash !== "string") {
        throw new Error("Formato de licencia inválido");
      }

      const bytes = CryptoJS.AES.decrypt(licenseHash, SECRET_KEY);
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedStr) throw new Error("Hash inválido o clave incorrecta");

      const decrypted = JSON.parse(decryptedStr);

      // Validar campos obligatorios
      if (
        !decrypted.deviceId ||
        !decrypted.validUntil ||
        !decrypted.generatedAt
      ) {
        throw new Error("Licencia invalida");
      }

      // Validar fechas
      const expirationDate = new Date(decrypted.validUntil);
      if (expirationDate < new Date()) {
        this.app.dialog.alert(
          "La licencia expiró el " + expirationDate.toLocaleDateString()
        );
        return false;
      }

      return decrypted;
    } catch (error) {
      this.app.dialog.alert(error.message);
      return false;
    }
  },

  async checkLicenseStatus() {
    try {
      const licenseHash = await capacitorApp.getLicense();
      if (!licenseHash) {
        this.app.dialog.alert("No hay licencia activa");
        return false;
      }

      const licenseData = this.verifyLicense(licenseHash);
      if (!licenseData) return false;

      const expirationDate = new Date(licenseData.validUntil);
      const daysLeft = Math.ceil(
        (expirationDate - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Actualizar UI en todas las páginas posibles
      const updateUI = (prefix) => {
        const deviceEl = document.getElementById(`${prefix}-device`);
        const expirationEl = document.getElementById(`${prefix}-expiration`);
        const daysEl = document.getElementById(`${prefix}-days`);

        if (deviceEl)
          deviceEl.textContent =
            licenseData.model || "Dispositivo no identificado";
        if (expirationEl)
          expirationEl.textContent = expirationDate.toLocaleDateString();
        if (daysEl)
          daysEl.textContent =
            daysLeft > 0 ? `${daysLeft} días restantes` : "EXPIRADA";
      };

      // Actualizar popup de dev tools
      updateUI("license-status");

      // Actualizar página de vista de licencia
      updateUI("license-view");

      // Mostrar notificación si está por expirar
      if (daysLeft <= 7 && daysLeft > 0) {
        this.app.dialog.alert(`Tu licencia expira en ${daysLeft} días`);
      }

      return true;
    } catch (error) {
      this.app.dialog.alert(error.message);
      return false;
    }
  },
  copyToClipboard: async function (id) {
    try {
      const element = document.getElementById(id);
      if (!element) {
        throw new Error("Elemento no encontrado");
      }

      // Seleccionar el texto
      element.select();
      element.setSelectionRange(0, 99999); // Para dispositivos móviles

      // Intentar usar la API moderna del portapapeles
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(element.value);
      }
      // Fallback para navegadores más antiguos
      else {
        const success = document.execCommand("copy");
        if (!success) {
          throw new Error("No se pudo copiar al portapapeles");
        }
      }

      // Mostrar feedback al usuario
      if (window.app && window.app.toast) {
        window.app.toast
          .create({
            text: "Texto copiado al portapapeles",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      }
    } catch (error) {
      console.error("Error al copiar:", error);
      if (window.app && window.app.dialog) {
        window.app.dialog.alert("Error al copiar: " + error.message);
      }
    }
  },

  /**
   * Funciones de notificaciones
   */
  forceNotificationTest: function () {
    capacitorApp.showNotification(
      "Prueba de notificación",
      "Esta es una notificación de prueba",
      new Date(new Date().getTime() + 2000)
    );
  },

  sendCustomNotification: function () {
    const titleInput = document.getElementById("custom-notif-title");
    const messageInput = document.getElementById("custom-notif-message");
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();

    if (!title || !message) {
      this.app.dialog.alert("Por favor completa el título y el mensaje");
      return;
    }

    capacitorApp.showNotification(
      title,
      message,
      new Date(new Date().getTime() + 5000)
    );

    this.app.dialog.alert(
      "Notificación programada para mostrarse en 5 segundos"
    );
    titleInput.value = "";
    messageInput.value = "";
  },
  toggleDevMode: function (e) {
    const enabled = e.target.checked;

    // Mostrar/ocultar enlace a herramientas de desarrollo
    const devToolsLink = document.getElementById("dev-tools-link");
    if (devToolsLink) {
      devToolsLink.style.display = enabled ? "block" : "none";
    }

    // Guardar preferencia
    localStorage.setItem("devModeEnabled", enabled.toString());

    // Mostrar notificación
    if (this.app) {
      this.app.toast
        .create({
          text: `Modo desarrollador ${enabled ? "activado" : "desactivado"}`,
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    }
  },
};
