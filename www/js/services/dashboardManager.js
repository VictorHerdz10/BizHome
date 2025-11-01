import { getProducts } from "../database/products.js";
import {
  getRetencionesAcumuladas,
  getTopSalesDays,
  getVentas,
} from "../database/sales.js";
import {
  getDailyExpensesRanking,
  getDailyLimit,
  getGastos,
} from "../database/expenses.js";
import { getCategoriesWithSales } from "../database/categories.js";

export class DashboardManager {
  constructor(app) {
    this.app = app;
    this.charts = {
      sales: null,
      expenses: null,
      categories: null,
    };
    this.dailyLimit = 500;
  }

  async initDashboard() {
    try {
      // Cargar todos los datos en paralelo
      const [
        productos,
        categorias,
        retenciones,
        topVentasDias,
        rankingGastos,
        limiteDiario,
        ventas,
        gastos,
      ] = await Promise.all([
        getProducts(),
        getCategoriesWithSales(),
        getRetencionesAcumuladas(),
        getTopSalesDays(5),
        getDailyExpensesRanking(),
        getDailyLimit(),
        getVentas(),
        getGastos(),
      ]);

      this.dailyLimit = limiteDiario;

      // Calcular resúmenes con datos reales
      const ventasResumen = this.calculateSalesSummary(ventas);
      const gastosResumen = this.calculateExpensesSummary(gastos);

      // Actualizar componentes con datos reales
      this.updateSummaryCards(ventasResumen, gastosResumen, retenciones);
      this.createSalesChart(ventas);
      this.createExpensesChart(gastosResumen);
      this.createCategoriesChart(categorias);
      this.updateRecentSalesTable(ventas.slice(-5).reverse());
      this.updateTopProducts(ventas);
      this.updateTopSalesDays(topVentasDias);
      this.updateTopExpensesDays(rankingGastos);
    } catch (error) {
      console.error("Error al inicializar el dashboard:", error);
      this.showError("Error al cargar los datos del dashboard");
    }
  }

  calculateSalesSummary(ventas) {
    const hoyStr = this.getCurrentDateString();
    const ayerStr = this.getPreviousDateString(hoyStr);

    const hoy = ventas.filter((v) => v.fecha === hoyStr);
    const ayer = ventas.filter((v) => v.fecha === ayerStr);

    // Calcular semana actual
    const weekRange = this.getWeekRange(hoyStr);
    const semana = ventas.filter((v) => {
      return v.fecha >= weekRange.start && v.fecha <= weekRange.end;
    });

    return {
      hoy: {
        total: hoy.reduce((sum, v) => sum + v.total, 0),
        ganancia: hoy.reduce((sum, v) => sum + (v.ganancia_neta || 0), 0),
      },
      ayer: {
        total: ayer.reduce((sum, v) => sum + v.total, 0),
        ganancia: ayer.reduce((sum, v) => sum + (v.ganancia_neta || 0), 0),
      },
      semana: {
        total: semana.reduce((sum, v) => sum + v.total, 0),
        ganancia: semana.reduce((sum, v) => sum + (v.ganancia_neta || 0), 0),
      },
    };
  }

calculateExpensesSummary(gastos) {
    const hoyStr = this.getCurrentDateString();
    const ayerStr = this.getPreviousDateString(hoyStr);

    const hoy = gastos.filter((g) => {
      const fechaGasto = g.fecha.split("T")[0]; // Extraer solo la parte de la fecha
      return fechaGasto === hoyStr;
    });
    
    const ayer = gastos.filter((g) => {
      const fechaGasto = g.fecha.split("T")[0]; // Extraer solo la parte de la fecha
      return fechaGasto === ayerStr;
    });

    // Calcular semana actual
    const weekRange = this.getWeekRange(hoyStr);
    const semana = gastos.filter((g) => {
      const fechaGasto = g.fecha.split("T")[0]; // Extraer solo la parte de la fecha
      return fechaGasto >= weekRange.start && fechaGasto <= weekRange.end;
    });

    return {
      hoy: hoy.reduce((sum, g) => sum + g.cantidad, 0),
      ayer: ayer.reduce((sum, g) => sum + g.cantidad, 0),
      semana: semana.reduce((sum, g) => sum + g.cantidad, 0),
    };
  }

  getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getPreviousDateString(currentDateStr) {
    const [year, month, day] = currentDateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);

    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, "0");
    const prevDay = String(date.getDate()).padStart(2, "0");
    return `${prevYear}-${prevMonth}-${prevDay}`;
  }

  getWeekRange(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return {
      start: format(monday),
      end: format(sunday),
    };
  }

  calculateWeeklyTrends(ventas) {
    const weekRange = this.getWeekRange(this.getCurrentDateString());
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    // Inicializar datos para cada día
    const salesData = days.map(() => 0);
    const profitData = days.map(() => 0);

    ventas.forEach((venta) => {
      if (venta.fecha >= weekRange.start && venta.fecha <= weekRange.end) {
        const [year, month, day] = venta.fecha.split("-").map(Number);
        const ventaDate = new Date(year, month - 1, day);
        const ventaDay = ventaDate.getDay(); // 0=Domingo, 1=Lunes,...6=Sábado

        // Ajustar índice para que Lunes=0, Domingo=6
        const adjustedIndex = ventaDay === 0 ? 6 : ventaDay - 1;

        salesData[adjustedIndex] += venta.total;
        profitData[adjustedIndex] += venta.ganancia_neta;
      }
    });

    return { salesData, profitData };
  }

  createSalesChart(ventas) {
    const ctx = document.getElementById("salesChart");
    if (!ctx) return;

    if (this.charts.sales) this.charts.sales.destroy();

    const { salesData, profitData } = this.calculateWeeklyTrends(ventas);
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    this.charts.sales = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [
          {
            label: "Ventas ($)",
            data: salesData,
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Ganancias ($)",
            data: profitData,
            borderColor: "#2ecc71",
            backgroundColor: "rgba(46, 204, 113, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: this.getChartOptions("Tendencias de Ventas Semanales"),
    });
  }

  createExpensesChart(gastosResumen) {
    const ctx = document.getElementById("expensesChart");
    if (!ctx) return;

    if (this.charts.expenses) this.charts.expenses.destroy();

    const porcentajeUsado = (gastosResumen.hoy / this.dailyLimit) * 100;
    const color =
      porcentajeUsado > 90
        ? "#e74c3c"
        : porcentajeUsado > 70
        ? "#f39c12"
        : "#2ecc71";

    this.charts.expenses = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Gastado", "Disponible"],
        datasets: [
          {
            data: [
              gastosResumen.hoy,
              Math.max(0, this.dailyLimit - gastosResumen.hoy),
            ],
            backgroundColor: [color, "#f5f7fa"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Gastos hoy: $${gastosResumen.hoy.toFixed(
              2
            )} / $${this.dailyLimit.toFixed(2)}`,
            font: { size: 14 },
          },
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 20,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => `$${context.raw.toFixed(2)}`,
            },
          },
        },
        cutout: "75%",
        layout: {
          padding: {
            top: 20,
            bottom: 20,
          },
        },
      },
    });
  }

  createCategoriesChart(categorias) {
    const ctx = document.getElementById("categoriesChart");
    if (!ctx) return;

    if (this.charts.categories) this.charts.categories.destroy();

    // Preparar datos para el gráfico
    const labels = categorias.map((c) => c.nombre);
    const data = categorias.map((c) => c.ventas_total || 0);
    const colors = this.generateColors(categorias.length);

    this.charts.categories = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Ventas por Categoría ($)",
            data: data,
            backgroundColor: colors,
            borderColor: colors.map((c) => this.adjustColor(c, -20)),
            borderWidth: 1,
          },
        ],
      },
      options: this.getChartOptions("Distribución de Ventas por Categoría"),
    });
  }

  getChartOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16 },
        },
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "$" + value,
          },
        },
      },
    };
  }

updateSummaryCards(ventas, gastos, retenciones) {
  // Función mejorada que muestra valor ayer + diferencia absoluta
  const getComparisonText = (current, previous, isExpense = false) => {
    // Caso 1: No hay datos de ayer
    if (!previous || previous === 0) {
      return `<div style="font-size: 12px; color: #3498db;">
        Ayer: $0.00 | <span style="color: #2ecc71;">+$${current.toFixed(2)}</span>
      </div>`;
    }

    // Caso 2: No hay datos hoy
    if (!current || current === 0) {
      return `<div style="font-size: 12px; color: #7f8c8d;">
        Ayer: $${previous.toFixed(2)} | <span style="color: #e74c3c;">-$${previous.toFixed(2)}</span>
      </div>`;
    }

    // Caso 3: Ambos tienen datos
    const difference = current - previous;
    const absoluteDiff = Math.abs(difference);
    const symbol = difference >= 0 ? (isExpense ? '🔴' : '🟢') : (isExpense ? '🟢' : '🔴');
    const color = difference >= 0 ? (isExpense ? '#e74c3c' : '#2ecc71') : (isExpense ? '#2ecc71' : '#e74c3c');

    return `<div style="font-size: 12px;">
      <span style="color: #7f8c8d;">Ayer: $${previous.toFixed(2)}</span> | 
      <span style="color: ${color}">${symbol} $${absoluteDiff.toFixed(2)}</span>
    </div>`;
  };

  // Obtenemos valores con protección
  const ventasHoy = ventas?.hoy?.total || 0;
  const ventasAyer = ventas?.ayer?.total || 0;
  const gananciasHoy = ventas?.hoy?.ganancia || 0;
  const gananciasAyer = ventas?.ayer?.ganancia || 0;
  const gastosHoy = gastos?.hoy || 0;
  const gastosAyer = gastos?.ayer || 0;

  // Actualizamos tarjetas
  const cards = document.querySelectorAll(".summary-cards .col-33");
  
  // Tarjeta Ventas
  if (cards[0]) {
    cards[0].querySelector(".summary-value").textContent = `$${ventasHoy.toFixed(2)}`;
    cards[0].querySelector(".summary-label").innerHTML = `
      <div style="font-size: 14px; color: #7f8c8d;">Ventas hoy</div>
      ${getComparisonText(ventasHoy, ventasAyer)}
    `;
  }

  // Tarjeta Ganancias
  if (cards[1]) {
    cards[1].querySelector(".summary-value").textContent = `$${gananciasHoy.toFixed(2)}`;
    cards[1].querySelector(".summary-label").innerHTML = `
      <div style="font-size: 14px; color: #7f8c8d;">Ganancias hoy</div>
      ${getComparisonText(gananciasHoy, gananciasAyer)}
    `;
  }

  // Tarjeta Gastos (con lógica inversa)
  if (cards[2]) {
    cards[2].querySelector(".summary-value").textContent = `$${gastosHoy.toFixed(2)}`;
    cards[2].querySelector(".summary-label").innerHTML = `
      <div style="font-size: 14px; color: #7f8c8d;">Gastos hoy</div>
      ${getComparisonText(gastosHoy, gastosAyer, true)}
    `;
  }
}

  updateRecentSalesTable(ventas) {
    const tbody = document.getElementById("recentSalesTable");
    if (!tbody) return;

    tbody.innerHTML =
      ventas.length > 0
        ? ""
        : '<tr><td colspan="4" style="text-align: center;">No hay ventas recientes</td></tr>';

    ventas.forEach((venta) => {
      const [year, month, day] = venta.fecha.split("-").map(Number);
      const fecha = new Date(year, month - 1, day);
      const fechaStr = fecha.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="padding: 8px 12px;">#${venta.id}</td>
        <td style="padding: 8px 12px;">${fechaStr}</td>
        <td style="padding: 8px 12px;">${venta.producto_nombre}</td>
        <td style="padding: 8px 12px; text-align: right; color: #2ecc71;">$${venta.total.toFixed(
          2
        )}</td>
      `;
      tbody.appendChild(row);
    });
  }

  updateTopProducts(ventas) {
    const topList = document.getElementById("topProducts");
    const lowStockList = document.getElementById("lowStockProducts");

    if (topList) {
      // Calcular productos más vendidos basado en ventas reales
      const productSales = {};
      ventas.forEach((venta) => {
        if (!productSales[venta.producto_id]) {
          productSales[venta.producto_id] = {
            id: venta.producto_id,
            nombre: venta.producto_nombre,
            ventas: 0,
            cantidad: 0,
          };
        }
        productSales[venta.producto_id].ventas++;
        productSales[venta.producto_id].cantidad += venta.cantidad;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 3);

      topList.innerHTML =
        topProducts.length > 0
          ? topProducts
              .map(
                (p, i) => `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
              <span>${i + 1}. ${p.nombre}</span>
              <span class="badge" style="background-color: var(--f7-color-primary);">
                ${p.cantidad} vendidos
              </span>
            </li>
          `
              )
              .join("")
          : "<li>No hay datos de ventas</li>";
    }

    if (lowStockList) {
      // Obtener productos con bajo stock
      getProducts().then((productos) => {
        const lowStockProducts = [...productos]
          .filter((p) => p.stock < 10)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 3);

        lowStockList.innerHTML =
          lowStockProducts.length > 0
            ? lowStockProducts
                .map(
                  (p) => `
              <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span>${p.nombre}</span>
                <span class="badge" style="background-color: ${
                  p.stock < 3 ? "#e74c3c" : "#f39c12"
                };">
                  ${p.stock} ${p.tipo_unidad}
                </span>
              </li>
            `
                )
                .join("")
            : "<li>Stock suficiente</li>";
      });
    }
  }

  updateTopSalesDays(days) {
    const container = document.getElementById("topSalesDays");
    if (!container) return;

    container.innerHTML =
      days.length > 0
        ? ""
        : "<li style='padding: 12px 16px;'>No hay datos de ventas</li>";

    days.forEach((day, index) => {
      const [year, month, dayNum] = day.fecha.split("-").map(Number);
      const date = new Date(year, month - 1, dayNum);

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "12px 16px";
      li.style.borderBottom = "1px solid #f0f0f0";

      li.innerHTML = `
        <span>${index + 1}. ${date.toLocaleDateString("es")}</span>
        <span class="badge" style="background-color: var(--f7-color-primary);">
          $${day.total_ventas.toFixed(2)}
        </span>
      `;
      container.appendChild(li);
    });
  }

  updateTopExpensesDays(days) {
    const container = document.getElementById("topExpensesDays");
    if (!container) return;

    container.innerHTML =
      days.length > 0
        ? ""
        : "<li style='padding: 12px 16px;'>No hay datos de gastos</li>";

    days.forEach((day, index) => {
      const [year, month, dayNum] = day.day.split("-").map(Number);
      const date = new Date(year, month - 1, dayNum);

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.padding = "12px 16px";
      li.style.borderBottom = "1px solid #f0f0f0";

      li.innerHTML = `
        <span>${index + 1}. ${date.toLocaleDateString("es")}</span>
        <span class="badge" style="background-color: #e74c3c;">
          $${day.total.toFixed(2)}
        </span>
      `;
      container.appendChild(li);
    });
  }

  generateColors(count) {
    const colors = [];
    const hueStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const hue = i * hueStep;
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }

    return colors;
  }

  adjustColor(color, amount) {
    return color.replace(/hsl\((\d+), (\d+)%, (\d+)%\)/, (_, h, s, l) => {
      const newLightness = Math.min(100, Math.max(0, parseInt(l) + amount));
      return `hsl(${h}, ${s}%, ${newLightness}%)`;
    });
  }

  showError(message) {
    this.app.dialog.alert(message, "Error");
  }

  async refreshDashboard() {
    await this.initDashboard();
  }
}
