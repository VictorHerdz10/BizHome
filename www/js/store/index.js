import { initConnection } from "../database/connection.js";
import {
  addCategory,
  deleteCategory,
  getCategories,
  getProductsByCategory,
  updateCategory,
} from "../database/categories.js";
import {
  getProductById,
  getProducts,
  updateStock,
} from "../database/products.js";
import {
  getVentas,
  getRetencionesAcumuladas,
  updateVenta,
} from "../database/sales.js";
import {
  addGasto,
  deleteGasto,
  getDailyExpensesRanking,
  getExpensesByDay,
  getGastos,
  updateGasto,
} from "../database/expenses.js";
import { getConfiguracionCompleta, updateConfig } from "../database/config.js";

var createStore = Framework7.createStore;

const store = createStore({
  state: {
    databaseReady: false,
    loading: false,
    categories: [],
    products: [],
    ventas: [],
    gastos: [],
    productsByCategory: [],
    resumenVentas: {
      hoy: { total: 0, ganancia: 0 },
      semana: { total: 0, ganancia: 0 },
      mes: { total: 0, ganancia: 0 },
    },
    resumenGastos: {
      hoy: 0,
      semana: 0,
      mes: 0,
      rankingDias: [],
      promedioDiario: 0,
      promedioSemanal: 0,
      totalMes: 0,
      porcentajeLimite: 0,
    },
    retencionAcumulada: 0,
    configuracion: {
      retener_ganancias: false,
      porcentaje_retencion: 10,
      limite_diario_gastos: 500,
    },
  },
  getters: {
    products({ state }) {
      return state.products;
    },
    categories({ state }) {
      return state.categories;
    },
    ventas({ state }) {
      return state.ventas;
    },
    gastos({ state }) {
      return state.gastos;
    },
    resumenVentas({ state }) {
      return state.resumenVentas;
    },
    resumenGastos({ state }) {
      return state.resumenGastos;
    },
    retencionAcumulada({ state }) {
      return state.retencionAcumulada;
    },
    configuracion({ state }) {
      return state.configuracion;
    },
    productsByCategory({ state }) {
      return state.productsByCategory;
    },
    isLoading({ state }) {
      return state.loading;
    },
  },
  actions: {
    async initApp({ state }) {
      state.loading = true;
      try {
        state.databaseReady = await initConnection();
        await this.refreshAllData({ state });
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        state.loading = false;
      }
    },

    async refreshAllData({ state }) {
      state.loading = true;
      try {
        state.categories = await getCategories();
        state.products = await getProducts();
        state.ventas = await getVentas();
        state.gastos = await getGastos();
        state.retencionAcumulada = await getRetencionesAcumuladas();

        // Cargar configuración
        const config = await getConfiguracionCompleta();
        config.forEach((item) => {
          if (item.clave === "retener_ganancias") {
            state.configuracion.retener_ganancias = item.valor === "true";
          } else if (item.clave === "porcentaje_retencion") {
            state.configuracion.porcentaje_retencion = parseFloat(item.valor);
          }
        });
      } catch (error) {
        console.error("Refresh error:", error);
      } finally {
        state.loading = false;
      }
    },

    async updateVenta({ state }, venta) {
      try {
        await updateVenta(venta);
        await this.refreshAllData({ state });
        return true;
      } catch (error) {
        throw error;
      }
    },

    async updateGasto({ state }, gasto) {
      try {
        await updateGasto(gasto);
        await this.refreshAllData({ state });
        return true;
      } catch (error) {
        throw error;
      }
    },

    async updateConfiguracion({ state }, { clave, valor }) {
      try {
        await updateConfig(clave, valor);
        const config = await getConfiguracionCompleta();
        config.forEach((item) => {
          if (item.clave === "retener_ganancias") {
            state.configuracion.retener_ganancias = item.valor === "true";
          } else if (item.clave === "porcentaje_retencion") {
            state.configuracion.porcentaje_retencion = parseFloat(item.valor);
          }
        });
        return true;
      } catch (error) {
        throw error;
      }
    },
    async refreshCategories({ state }) {
      state.loading = true;
      try {
        state.categories = await getCategories();
      } catch (error) {
        console.error("Refresh categories error:", error);
      } finally {
        state.loading = false;
      }
    },
    async refreshProducts({ state }) {
      state.loading = true;
      try {
        state.products = await getProducts();
      } catch (error) {
        console.error("Refresh products error:", error);
      } finally {
        state.loading = false;
      }
    },
    async refreshVentas({ state }) {
      state.loading = true;
      try {
        state.ventas = await getVentas();
      } catch (error) {
        console.error("Refresh ventas error:", error);
      } finally {
        state.loading = false;
      }
    },
    async refreshConfig({ state }) {
      state.loading = true;
      try {
        // Cargar configuración
        const config = await getConfiguracionCompleta();
        config.forEach((item) => {
          if (item.clave === "retener_ganancias") {
            state.configuracion.retener_ganancias = item.valor === "true";
          } else if (item.clave === "porcentaje_retencion") {
            state.configuracion.porcentaje_retencion = parseFloat(item.valor);
          }
        });
      } catch (error) {
        console.error("Refresh config error:", error);
      } finally {
        state.loading = false;
      }
    },
    async crearCategoria({ state }, categoria) {
      try {
        await addCategory(categoria);
        await this.refreshCategories({ state });
      } catch (error) {
        throw error;
      }
    },
    async actualizarCategoria({ state }, categoria) {
      try {
        await updateCategory(categoria);
        await this.refreshCategories({ state });
      } catch (error) {
        throw error;
      }
    },
    async eliminarCategoria({ state }, id) {
      try {
        await deleteCategory(id);
        await this.refreshCategories({ state });
      } catch (error) {
        throw error;
      }
    },
  },
  async refreshProductsByCategory({ state }, id) {
    state.loading = true;
    try {
      state.productsByCategory = await getProductsByCategory(id);
    } catch (error) {
      console.error("Refresh products by category error:", error);
    } finally {
      state.loading = false;
    }
  },

  async getProductById({ state }, id) {
    try {
      await this.refreshProducts({ state });
      return await getProductById(id);
    } catch (error) {
      throw error;
    }
  },

  async updateStock({ state }, { productoId, cantidad }) {
    try {
      await updateStock(productoId, cantidad);
      await this.refreshProducts({ state });
    } catch (error) {
      throw error;
    }
  },
  async addGasto({ state }, gasto) {
    try {
      await addGasto(gasto);
      await this.refreshGastos({ state });
      return true;
    } catch (error) {
      throw error;
    }
  },

  async deleteGasto({ state }, id) {
    try {
      await deleteGasto(id);
      await this.refreshGastos({ state });
      return true;
    } catch (error) {
      throw error;
    }
  },

  async refreshGastos({ state }, { filter = "hoy", customDate = null }) {
    state.loading = true;
    try {
      state.gastos = await getGastos({ filter, customDate });
    } catch (error) {
      console.error("Refresh gastos error:", error);
    } finally {
      state.loading = false;
    }
  },

  async getDailyExpensesRankingData() {
    try {
      return await getDailyExpensesRanking();
    } catch (error) {
      throw error;
    }
  },

  async getExpensesByDay({}, day) {
    try {
      return await getExpensesByDay(day);
    } catch (error) {
      throw error;
    }
  },
});

export default store;
