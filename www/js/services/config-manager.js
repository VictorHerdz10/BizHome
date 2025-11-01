import capacitorApp from "../capacitor-app.js";
import { NotificationManager } from "../database/notifications.js";

export const ConfigManager = {
  app: null,
  isHandlingChange: false,
  // Función para cargar configuración inicial
  loadConfig: async function (appParam) {
    try {
      this.app = appParam;
      await this.refreshUIConfig();
      await this.refreshNotificationUI();
    } catch (error) {
      console.error("Error loading config:", error);
      appParam.dialog.alert("No se pudo cargar la configuración inicial");
    }
  },
  refreshUIConfig: async function () {
    if (!this.app) return;

    try {
      // Forzar actualización del store
      await this.app.store.dispatch("refreshConfig");

      const config = this.app.store.getters.configuracion.value;
      const retainEarnings = config.retener_ganancias;
      const retentionPercent = parseInt(config.porcentaje_retencion);

      // Actualizar UI
      this.app.$('[name="retention-percent"]').val(retentionPercent);
      this.app.$('[name="retain-earnings"]').prop("checked", retainEarnings);
    } catch (error) {
      console.error("Error refreshing UI config:", error);
    }
  },

  // Función para manejar cambios en el toggle
  handleToggleChange: async function (e) {
    // Si ya estamos manejando un cambio, salir
    if (this.isHandlingChange) return;

    this.isHandlingChange = true;
    const enabled = e.target.checked;
    this.app.preloader.show();

    try {
      await this.app.store.dispatch("updateConfiguracion", {
        clave: "retener_ganancias",
        valor: enabled.toString(),
      });

      this.app.toast
        .create({
          text: `Retención ${enabled ? "activada" : "desactivada"}`,
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    } catch (error) {
      console.error("Error:", error);
      // Revertir visualmente (sin disparar otro evento)
      this.isHandlingChange = true; // Temporalmente ignorar el próximo cambio
      e.target.checked = !enabled;
      this.app.dialog.alert("No se pudo actualizar");
    } finally {
      this.app.preloader.hide();
      setTimeout(() => (this.isHandlingChange = false), 300);
    }
  },

  handlePercentChange: async function (e) {
    if (this.isHandlingChange) return;
    this.isHandlingChange = true;

    let percent = parseInt(e.target.value) || 0;
    percent = Math.max(0, Math.min(100, percent));

    this.app.preloader.show();
    try {
      await this.app.store.dispatch("updateConfiguracion", {
        clave: "porcentaje_retencion",
        valor: percent.toString(),
      });

      this.app.toast
        .create({
          text: `Porcentaje actualizado a ${percent}%`,
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    } catch (error) {
      console.error("Error:", error);
      // Revertir visualmente
      this.isHandlingChange = true;
      e.target.value =
        this.app.store.getters.configuracion.value.porcentaje_retencion || 10;
      this.app.dialog.alert("No se pudo actualizar");
    } finally {
      this.app.preloader.hide();
      setTimeout(() => (this.isHandlingChange = false), 100);
    }
  },

  // Función para calcular retención
  calculateRetention: function (amount) {
    const percent =
      parseInt(
        this.app.store.getters.configuracion.value.porcentaje_retencion
      ) || 10;
    return amount * (percent / 100);
  },
  handleDarkModeChange: async function (e) {
    if (this.isHandlingChange) return;
    this.isHandlingChange = true;

    const enabled = e.target.checked;
    this.app.preloader.show();

    try {
      // Mostrar advertencia para versiones previas
      if (enabled) {
        await this.app.dialog.alert(
          "El modo oscuro  estará disponible en próximas actualizaciones"
        );
        e.target.checked = !enabled;
      }
    } catch (error) {
      console.error("Error:", error);
      e.target.checked = !enabled;
    } finally {
      this.app.preloader.hide();
      setTimeout(() => (this.isHandlingChange = false), 300);
    }
  },
  // En config-manager.js
  handleNotificationToggle: async function (e) {
    if (this.isHandlingChange) return;
    this.isHandlingChange = true;

    const enabled = e.target.checked;
    this.app.preloader.show();

    try {
      // Verificar primero si el estado actual es diferente
      const currentStatus = await NotificationManager.getStatus();
      if (currentStatus === enabled) {
        return; // No hacer nada si el estado no cambió
      }

      await NotificationManager.setStatus(enabled);

      if (enabled) {
        await capacitorApp.initNotifications();
      } else {
        await capacitorApp.disableNotifications();
      }

      this.app.toast
        .create({
          text: `Notificaciones ${enabled ? "activadas" : "desactivadas"}`,
          position: "center",
          closeTimeout: 1500,
        })
        .open();
    } catch (error) {
      console.error("Error en handleNotificationToggle:", error);
      // Revertir el cambio en la UI
      this.app.$('[name="notifications"]').prop("checked", !enabled);
      this.app.dialog.alert(
        `Error al ${enabled ? "activar" : "desactivar"} notificaciones: ${
          error.message || error
        }`
      );
    } finally {
      this.app.preloader.hide();
      this.isHandlingChange = false;
    }
  },

  // Añadir esta función para refrescar el estado
  refreshNotificationUI: async function () {
    if (!this.app) return;

    try {
      const isEnabled = await NotificationManager.getStatus();
      this.app.$('[name="notifications"]').prop("checked", isEnabled);
    } catch (error) {
      console.error("Error refreshing notification UI:", error);
    }
  },
};

window.handleDarkModeChange = ConfigManager.handleDarkModeChange;
window.handleNotificationToggle = ConfigManager.handleNotificationToggle;
window.calculateRetention = ConfigManager.calculateRetention;
window.handleToggleChange = ConfigManager.handleToggleChange;
window.handlePercentChange = ConfigManager.handlePercentChange;
