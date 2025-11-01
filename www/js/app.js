import store from "./store/index.js";
import capacitorApp from "./capacitor-app.js";
import { routes } from "./routes.js";
import { ToolsDev } from "./dev/tool-dev.js";
import { SeguridadDB } from "./database/seguridad-db.js";

var $ = Dom7;

var app = new Framework7({
  name: "BizHome",
  theme: "auto",
  el: "#app",
  store: store,
  routes: routes,
  on: {
    init: async function () {
      const app = this;
      const errors = [];

      try {
        
        await store.dispatch("initApp");
        if (app.device.capacitor) {
          try {
            await capacitorApp.init(app);
          } catch (error) {
            errors.push(`Error en Capacitor: ${error.message}`);
            console.error("Error en Capacitor:", error);
          }
        }
        
        const securityConfig = await SeguridadDB.getConfig();
        if (securityConfig.activado && securityConfig.metodo) {
          // Redirigir a pantalla de desbloqueo si la seguridad está activada
          if (app.views.current.router.url !== "/unlock/") {
            app.views.main.router.navigate("/unlock/", {
              clearPreviousHistory: true,
            });
          }
        } else {
          // Redirigir a home si no hay seguridad activa
          if (app.views.current.router.url === "/unlock/") {
            app.views.main.router.navigate("/", {
              clearPreviousHistory: true,
            });
          }
        }

        const licenseHash = await capacitorApp.getLicense();
        if (!licenseHash) {
          app.views.main.router.navigate("/licencia/");
        } else {
          try {
            const decrypted = ToolsDev.verifyLicense(licenseHash);
            if (!decrypted) {
              app.views.main.router.navigate("/licencia/");
            } else {
              // Redirigir a home si la licencia es válida
              if (app.views.current.router.url === "/licencia/") {
                app.views.main.router.navigate("/", {
                  clearPreviousHistory: true, // Esto limpia el historial
                });
              }
            }
          } catch (error) {
            console.error("Error verificando licencia:", error);
            app.views.main.router.navigate("/licencia/");
          }
        }
      } catch (error) {
        errors.push(`Error inicial general: ${error.message}`);
      }

      if (errors.length > 0) {
        console.error("Errores de inicialización:", errors);
        app.dialog.alert(
          `Errores durante la inicialización:\n\n${errors.join("\n\n")}`
        );
      } else {
        /*app.toast
          .create({
            text: "Aplicación lista",
            position: "center",
            closeTimeout: 2000,
          })
          .open();*/
      }
    },
    routeChange: function (newRoute, previousRoute, router) {
        manageRouterHistory(router); // ← Aplicar control aquí
      }
  },
});

function manageRouterHistory(router) {
  const MAX_HISTORY = 5; // Máximo de rutas en historial
  const HOME_ROUTE = "/"; // Tu ruta home

  // Asegurar que el home siempre esté primero
  if (router.history.length === 0 || router.history[0] !== HOME_ROUTE) {
    router.history.unshift(HOME_ROUTE);
  }

  // Limitar el tamaño del historial
  if (router.history.length > MAX_HISTORY) {
    // Conservar el home + las últimas (MAX_HISTORY - 1) rutas
    router.history = [
      HOME_ROUTE,
      ...router.history.slice(-(MAX_HISTORY - 1))
    ];
  }
}

// Configuración global
window.app = app;
