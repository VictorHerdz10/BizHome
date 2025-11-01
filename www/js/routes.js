import { AboutPage } from "./services/about.js";
import { CategoriesManager } from "./services/categoriesManager.js";
import { ConfigManager } from "./services/config-manager.js";
import { ExpensesManager } from "./services/expensesManager.js";
import { ProductsManager } from "./services/productsManager.js";
import { SalesManager } from "./services/salesManager.js";
import { DashboardManager } from "./services/dashboardManager.js";
import { ToolsDev } from "./dev/tool-dev.js";
import capacitorApp from "./capacitor-app.js";
import { SeguridadManager } from "./services/seguridadManager.js";
import { SeguridadDB } from "./database/seguridad-db.js";

// routes.js
export var routes = [
  {
    path: "/",
    url: "./index.html",
    on: {
      pageInit: async function () {
        // Verificar licencia al cargar
       const licenseHash = await capacitorApp.getLicense();

        if (!licenseHash) {
          // No hay licencia, redirigir a pantalla de activación
          window.app.views.main.router.navigate("/licencia/", {
            clearPreviousHistory: true,
          });
          return;
        }

        try {
          const decrypted = ToolsDev.verifyLicense(licenseHash);
          if (!decrypted) {
            // Licencia inválida o expirada
            window.app.views.main.router.navigate("/licencia/", {
              clearPreviousHistory: true,
            });
          }
        } catch (error) {
          console.error("Error verificando licencia:", error);
          window.app.views.main.router.navigate("/licencia/", {
            clearPreviousHistory: true,
          });
        }
      },
    },
  },
  {
    path: "/licencia/",
    url: "./pages/license-check.html",
    on: {
      pageInit: async function () {
        
        ToolsDev.initToolsDev(window.app);
        // Mostrar UI de activación
        document.getElementById("verifying-container").style.display = "none";
        document.getElementById("no-license-container").style.display = "block";

        // Generar QR automáticamente si no hay licencia
        const licenseHash = await capacitorApp.getLicense();
        if (!licenseHash) {
          await ToolsDev.generateDeviceQR();
        } else {
          // Si ya hay licencia válida, redirigir a home
          try {
            const decrypted = ToolsDev.verifyLicense(licenseHash);
            if (decrypted) {
              window.app.views.main.router.navigate("/", {
                clearPreviousHistory: true,
              });
            }
          } catch (error) {
            console.error("Error verificando licencia:", error);
          }
        }
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/dashboard/",
    url: "./pages/dashboard.html",
    on: {
      pageInit: async function () {
        const dashboardManager = new DashboardManager(window.app);
        await dashboardManager.initDashboard();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/productos/",
    url: "./pages/products.html",
    on: {
      pageInit: async function () {
        ProductsManager.init(window.app);
        await ProductsManager.loadProducts();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/categorias/",
    url: "./pages/categories.html",
    on: {
      pageInit: async function () {
        CategoriesManager.init(window.app);
        await CategoriesManager.loadCategories();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/ventas/",
    url: "./pages/sales.html",
    on: {
      pageInit: async function () {
        SalesManager.init(window.app);
        await SalesManager.loadSales();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/gastos/",
    url: "./pages/expenses.html",
    on: {
      pageInit: async function () {
        ExpensesManager.init(window.app);
        await ExpensesManager.loadExpenses();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/configuracion/",
    url: "./pages/config.html",
    on: {
      pageInit: async function (e) {
        await ConfigManager.loadConfig(window.app)
        await ConfigManager.refreshUIConfig();
        await ConfigManager.refreshNotificationUI(e);
        ToolsDev.initToolsDev(window.app);
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/about/",
    url: "./pages/about.html",
    on: {
      pageInit: function () {
        AboutPage.init();
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    },
  },
  {
    path: "/soporte/",
    url: "./pages/support.html",
  },
  {
    path: "/retencion-info/",
    url: "./pages/profit-info.html",
  },
  {
    path: "/developer-tools/",
    url: "./pages/developer-tools.html",
    
    on: {
      pageInit: async function () {
        ToolsDev.initToolsDev(window.app);
      },
       pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
    }
  },
  {
    path: "/licenciaview/",
    url: "./pages/licencia-view.html",
  },
  {
    path: "/seguridad/",
    url: "./pages/seguridad.html",
   on: {
    pageInit: async function() {
      SeguridadManager.init(window.app);
      SeguridadManager.loadSecurityPage();
    },
     pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
  }
  },
  {
  path: "/unlock/",
  url: "./pages/unlock.html",
  on: {
    pageInit: async function() {
      // Configurar botón de salida de emergencia
      document.getElementById('emergency-exit')?.addEventListener('click', () => {
        if (window.Capacitor?.Plugins?.App) {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
      SeguridadManager.init(window.app)
      // Cargar configuración de seguridad
      const config = await SeguridadDB.getConfig();
      
      // Mostrar el método de desbloqueo correspondiente
      SeguridadManager.showUnlockMethod(config.metodo);
    },
     pageBeforeRemove: function(page) {
        // SOLUCIÓN NUCLEAR - Elimina TODOS los listeners de la página
        const pageHtml = page.$el[0].outerHTML;
        page.$el[0].outerHTML = pageHtml;
      }
  }
}
];
