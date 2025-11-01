import capacitorApp from "../capacitor-app.js";
import {
  addGasto,
  deleteGasto,
  getDailyExpensesRanking,
  getDailyLimit,
  getGastos,
  setDailyLimit,
  updateGasto,
} from "../database/expenses.js";

export const ExpensesManager = {
  app: null,
  currentExpense: null,
  dailyLimit: 500,
  selectedDate: null,

  init(app) {
    this.app = app;
    this.loadDailyLimit();
    // Luego bindear eventos
    this.bindEvents();
    this.setupWeekFilter();
    this.setupMonthFilter();
    this.setupDatePicker();

    // Cargar datos iniciales
    this.loadExpenses();
  },
  async loadDailyLimit() {
    try {
      //
      this.dailyLimit = await getDailyLimit();
    } catch (error) {
      console.error("Error loading daily limit:", error);
      this.dailyLimit = 500; // Valor por defecto
    }
  },

  // Modificar el método setDailyLimit
  async setDailyLimit() {
    this.app.dialog.prompt(
      "Ingrese el monto máximo que desea gastar por día",
      "Establecer límite diario de gastos",
      async (value) => {
        if (value && !isNaN(value)) {
          const newLimit = parseFloat(value);
          try {
            await setDailyLimit(newLimit);
            this.dailyLimit = newLimit;
            await this.loadExpenses();

            this.app.toast
              .create({
                text: "Límite diario actualizado",
                position: "center",
                closeTimeout: 1500,
              })
              .open();
          } catch (error) {
            this.app.dialog.alert(
              "Error al guardar el límite: " + error.message
            );
          }
        }
      },
      () => {
        this.app.toast
          .create({
            text: "Se cancelo la actualizacion del límite diario",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      },
      this.dailyLimit.toFixed(2)
    );
  },

  bindEvents() {
    document
      .getElementById("add-expense-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewExpenseForm();
      });

    document
      .getElementById("add-expense-fab")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewExpenseForm();
      });

    document
      .getElementById("save-expense-btn")
      ?.addEventListener("click", () => this.saveExpense());
    document
      .getElementById("delete-expense-btn")
      ?.addEventListener("click", () => this.deleteExpense());

    // Filtros
    document
      .getElementById("filter-today")
      ?.addEventListener("click", () => this.loadExpenses("hoy"));
    document
      .getElementById("filter-week")
      ?.addEventListener("click", () => this.loadExpenses("semana"));
    document
      .getElementById("filter-month")
      ?.addEventListener("click", () => this.loadExpenses("mes"));

    // Configurar límite diario
    document
      .getElementById("set-limit-btn")
      ?.addEventListener("click", () => this.setDailyLimit());

    document.getElementById("filter-week")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("week-filter-input").click();
    });

    document.getElementById("filter-month")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("month-filter-input").click();
    });
    document.getElementById("info-button-expenses")?.addEventListener("click", (e) => {
    e.preventDefault();
    console
    this.app.popup.open(".info-popup-expenses", {
      animate: true,
      on: {
        open: function() {
          // Forzar repintado para que funcionen las animaciones
          setTimeout(() => {
            document.querySelectorAll('.info-popup-expenses .animate__animated').forEach(el => {
              el.style.opacity = '1';
            });
          }, 50);
        }
      }
    });
  });
  }, // Agrega esto al objeto ExpensesManager
  updateFilterFeedback(filter, customDate = null) {
    const feedbackEl = document.getElementById("filter-feedback-text");
    if (!feedbackEl) return;

    const today = new Date();
    const todayStr = this.formatLocalDate(today); // Usamos formato local consistente

    switch (filter) {
      case "hoy":
        feedbackEl.textContent = `Mostrando gastos de hoy (${this.formatLocalDate(
          today
        )})`;
        break;

      case "semana":
        if (customDate) {
          const start = this.parseLocalDate(customDate.start);
          const end = this.parseLocalDate(customDate.end);
          feedbackEl.textContent = `Mostrando semana del ${this.formatLocalDate(
            start
          )} al ${this.formatLocalDate(end)}`;
        } else {
          const weekRange = this.getWeekRange(todayStr);
          const start = this.parseLocalDate(weekRange.start);
          const end = this.parseLocalDate(weekRange.end);
          feedbackEl.textContent = `Mostrando semana actual (${this.formatLocalDate(
            start
          )} - ${this.formatLocalDate(end)})`;
        }
        break;

      case "mes":
        if (customDate) {
          const [year, month] = customDate.split("-");
          const monthDate = new Date(year, month - 1, 1);
          feedbackEl.textContent = `Mostrando gastos de ${monthDate.toLocaleDateString(
            "es",
            {
              month: "long",
              year: "numeric",
            }
          )}`;
        } else {
          feedbackEl.textContent = `Mostrando gastos de ${today.toLocaleDateString(
            "es",
            {
              month: "long",
              year: "numeric",
            }
          )}`;
        }
        break;

      default:
        feedbackEl.textContent = "Mostrando todos los gastos";
    }
  },
  // Nuevos métodos auxiliares para manejo consistente de fechas
  formatLocalDate(date) {
    // Acepta tanto Date como string YYYY-MM-DD
    const d = typeof date === "string" ? this.parseLocalDate(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  parseLocalDate(dateString) {
    // Parsea fecha en formato YYYY-MM-DD como fecha local (sin conversión UTC)
    const [year, month, day] = dateString.split("-");
    return new Date(year, month - 1, day);
  },

  formatDate(date) {
    return date.toLocaleDateString("es", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  },
  setupDatePicker() {
    this.app.calendar.create({
      inputEl: "#expense-date",
      dateFormat: "yyyy-mm-dd",
      openIn: "customModal",
      header: true,
      footer: true,
      closeOnSelect: true,
      on: {
        change: (calendar, value) => {
          if (value && value.length > 0) {
            // Formatear la fecha seleccionada correctamente
            const selectedDate = new Date(value[0]);
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
            const day = String(selectedDate.getDate()).padStart(2, "0");
            document.getElementById(
              "expense-date"
            ).value = `${year}-${month}-${day}`;
          }
        },
        close: () => {
          document.getElementById("ranking-card").style.opacity = "1";
          document.getElementById("ranking-card").style.filter = "none";
        },
      },
    });
  },
  setupWeekFilter() {
    this.app.calendar.create({
      inputEl: "#week-filter-input",
      dateFormat: "yyyy-mm-dd",
      openIn: "customModal",
      header: true,
      footer: true,
      closeOnSelect: true,
      on: {
        change: (calendar, value) => {
          if (value && value.length > 0) {
            // Asegurar que la fecha esté en formato local
            const localDate = new Date(value[0]);
            localDate.setMinutes(
              localDate.getMinutes() + localDate.getTimezoneOffset()
            );

            this.selectedWeek = this.getWeekRange(
              localDate.toISOString().split("T")[0]
            );
            this.loadExpenses("semana", this.selectedWeek);

            // Crear fechas locales para el feedback
            const start = this.parseLocalDate(this.selectedWeek.start);
            const end = this.parseLocalDate(this.selectedWeek.end);

            // Formatear fechas consistentemente
            const options = {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            };
            const startStr = start.toLocaleDateString("es", options);
            const endStr = end.toLocaleDateString("es", options);

            this.app.toast
              .create({
                text: `Semana del ${startStr} al ${endStr}`,
                position: "center",
                closeTimeout: 2000,
              })
              .open();

            // Actualizar feedback en la UI
            this.updateFilterFeedback("semana", this.selectedWeek);
          }
        },
      },
    });
  },

  setupMonthFilter() {
    this.app.calendar.create({
      inputEl: "#month-filter-input",
      dateFormat: "yyyy-mm",
      openIn: "customModal",
      header: true,
      footer: true,
      closeOnSelect: true,
      view: "months",
      on: {
        change: (calendar, value) => {
          if (value && value.length > 0) {
            const selectedDate = new Date(value[0]);
            const year = selectedDate.getFullYear();
            const month = (selectedDate.getMonth() + 1)
              .toString()
              .padStart(2, "0");
            this.selectedMonth = `${year}-${month}`;
            this.loadExpenses("mes", this.selectedMonth);

            this.app.toast
              .create({
                text: `Mes seleccionado: ${selectedDate.toLocaleDateString(
                  "es",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )}`,
                position: "center",
                closeTimeout: 2000,
              })
              .open();
          }
        },
      },
    });
  },
  getWeekRange(dateString) {
    // Solución 1: Parsear la fecha manualmente sin conversión UTC
    const [year, month, day] = dateString.split("-");
    const localDate = new Date(year, month - 1, day);

    // Obtener día de la semana (0=Domingo, 1=Lunes,...6=Sábado)
    const dayOfWeek = localDate.getDay();

    // Calcular lunes (inicio de semana)
    const monday = new Date(localDate);
    monday.setDate(localDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // Calcular domingo (fin de semana)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Función de formateo que preserva la fecha local
    const formatLocalDate = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const result = {
      start: formatLocalDate(monday),
      end: formatLocalDate(sunday),
    };

    return result;
  },

  showDatePicker() {
    document.getElementById("date-filter-input").click();
  },

  async loadExpenses(filter = "hoy", customDate = null) {
    try {
      this.showLoadingState(true);
      this.updateFilterFeedback(filter, customDate);

      const allExpenses = await getGastos();
      let filteredExpenses = [];

      switch (filter) {
        case "hoy":
          filteredExpenses = this.filterExpenses(allExpenses, "hoy");
          break;

        case "semana":
          if (customDate && customDate.start && customDate.end) {
            filteredExpenses = this.filterExpenses(
              allExpenses,
              "semana",
              customDate
            );
          } else {
            const weekRange = this.getWeekRange(
              new Date().toISOString().split("T")[0]
            );
            filteredExpenses = this.filterExpenses(
              allExpenses,
              "semana",
              weekRange
            );
            customDate = weekRange;
          }
          break;

        case "mes":
          if (customDate) {
            filteredExpenses = this.filterExpenses(
              allExpenses,
              "mes",
              customDate
            );
          } else {
            const currentMonth = new Date()
              .toISOString()
              .split("T")[0]
              .substring(0, 7);
            filteredExpenses = this.filterExpenses(
              allExpenses,
              "mes",
              currentMonth
            );
            customDate = currentMonth;
          }
          break;

        default:
          filteredExpenses = allExpenses;
      }

      const summary = this.calculateSummary(allExpenses, filter, customDate);

      if (filteredExpenses.length === 0) {
        this.showEmptyState(true, filter === "hoy");
        this.showExpensesList(false);
      } else {
        this.showEmptyState(false);
        this.renderExpenses(filteredExpenses);
        this.showExpensesList(true);
      }

      this.updateSummaryUI(summary, filter);
      this.checkDailyLimit(summary.hoy);
    } catch (error) {
      console.error("Error en loadExpenses:", error);
      this.app.dialog.alert(
        "Error al cargar gastos: " + (error?.message || "Error desconocido")
      );
    } finally {
      this.showLoadingState(false);
    }
  },

  filterExpenses(expenses, filter, customDate) {
    // Obtener fecha actual en formato local (sin horas/minutos/segundos)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLocalStr = this.formatLocalDate(today); // Formato YYYY-MM-DD
console.log(todayLocalStr)
    return expenses.filter((expense) => {
      // Parsear fecha del gasto como local
      const expenseDate = this.parseLocalDate(expense.fecha.split("T")[0]);
      const expenseDateStr = this.formatLocalDate(expenseDate);
  console.log(expenseDateStr)
      switch (filter) {
        case "hoy":
          return expenseDateStr === todayLocalStr;

        case "semana":
          if (customDate && customDate.start && customDate.end) {
            const start = this.parseLocalDate(customDate.start);
            const end = this.parseLocalDate(customDate.end);
            return expenseDate >= start && expenseDate <= end;
          } else {
            const weekRange = this.getWeekRange(todayLocalStr);
            const weekStart = this.parseLocalDate(weekRange.start);
            const weekEnd = this.parseLocalDate(weekRange.end);
            return expenseDate >= weekStart && expenseDate <= weekEnd;
          }

        case "mes":
          if (customDate) {
            const [year, month] = customDate.split("-");
            return (
              expenseDate.getFullYear() === parseInt(year) &&
              expenseDate.getMonth() + 1 === parseInt(month)
            );
          }
          return (
            expenseDate.getFullYear() === today.getFullYear() &&
            expenseDate.getMonth() === today.getMonth()
          );

        default:
          return true;
      }
    });
  },

  calculateSummary(expenses, filter, customDate) {
    const now =new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const currentMonth = todayStr.substring(0, 7);

    // 1. Calcular siempre el gasto de hoy
    const hoy = expenses
      .filter((e) => e.fecha.split("T")[0] === todayStr)
      .reduce((sum, e) => sum + e.cantidad, 0);

    // 2. Calcular SIEMPRE la semana actual (sin importar el filtro)
    const weekRange =
      filter === "semana" && customDate?.start && customDate?.end
        ? customDate
        : this.getWeekRange(todayStr);

    const semana = expenses
      .filter(
        (e) =>
          e.fecha.split("T")[0] >= weekRange.start &&
          e.fecha.split("T")[0] <= weekRange.end
      )
      .reduce((sum, e) => sum + e.cantidad, 0);

    // 3. Calcular mes (contextual según filtro)
    const monthRange = filter === "mes" ? customDate : currentMonth;
    const mes = expenses
      .filter((e) => e.fecha.split("T")[0].substring(0, 7) === monthRange)
      .reduce((sum, e) => sum + e.cantidad, 0);

    // 4. Calcular ranking de días
    const dailyTotals = {};
    expenses.forEach((expense) => {
      const date = expense.fecha.split("T")[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + expense.cantidad;
    });

    const rankingDias = Object.entries(dailyTotals)
      .map(([day, total]) => ({ day, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      hoy,
      semana, // Ahora siempre contiene el total de la semana actual
      mes,
      rankingDias,
      currentFilter: filter,
      weekRange, // Datos completos de la semana
      monthRange,
      isCurrentWeek: !customDate?.start, // Flag para saber si es la semana actual
    };
  },

renderExpenses(expenses) {
    const listEl = document.getElementById("expenses-list");
    listEl.innerHTML = "";
    // Detectar si es un dispositivo táctil
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    expenses.forEach((expense) => {
      const li = document.createElement("li");
      li.className = "expense-item";
      // Reducir padding y márgenes
      li.style.padding = "12px 10px";
      li.style.marginBottom = "8px";
      li.style.borderRadius = "10px";
      li.style.backgroundColor = "#fff";
      li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.transition = "all 0.3s ease";
      li.style.borderLeft = `3px solid ${this.getCategoryColor(expense.descripcion)}`;
      li.style.position = "relative";
      li.style.overflow = "hidden";
      li.style.outline = "none";

       if (!isTouchDevice) {
        li.addEventListener("mouseenter", () => {
          li.style.transform = "translateY(-2px)";
          li.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
        });
        li.addEventListener("mouseleave", () => {
          li.style.transform = "none";
          li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
        });
      }

      // Degradado de fondo (más sutil)
      const bgOverlay = document.createElement("div");
      bgOverlay.style.position = "absolute";
      bgOverlay.style.top = "0";
      bgOverlay.style.left = "0";
      bgOverlay.style.width = "100%";
      bgOverlay.style.height = "100%";
      bgOverlay.style.background = `linear-gradient(90deg, ${this.getCategoryColor(expense.descripcion)}08, transparent)`;
      bgOverlay.style.zIndex = "0";
      li.appendChild(bgOverlay);

      const contentWrapper = document.createElement("div");
      contentWrapper.style.display = "flex";
      contentWrapper.style.justifyContent = "space-between";
      contentWrapper.style.alignItems = "center";
      contentWrapper.style.width = "100%";
      contentWrapper.style.zIndex = "1";

      const leftContent = document.createElement("div");
      leftContent.style.flex = "1";
      leftContent.style.minWidth = "0";
      leftContent.style.overflow = "hidden"; // Asegurar que el texto no desborde

      // Contenedor de título con icono (más compacto)
      const titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.marginBottom = "4px";
      titleContainer.style.gap = "8px";

      const iconWrapper = document.createElement("div");
      iconWrapper.style.display = "flex";
      iconWrapper.style.alignItems = "center";
      iconWrapper.style.justifyContent = "center";
      // Reducir tamaño del icono
      iconWrapper.style.width = "28px";
      iconWrapper.style.height = "28px";
      iconWrapper.style.borderRadius = "6px";
      iconWrapper.style.backgroundColor = `${this.getCategoryColor(expense.descripcion)}15`;
      iconWrapper.style.color = this.getCategoryColor(expense.descripcion);

      const icon = document.createElement("i");
      icon.className = "material-icons";
      icon.style.fontSize = "16px"; // Icono más pequeño
      icon.textContent = this.getExpenseIcon(expense.descripcion);

      iconWrapper.appendChild(icon);

      const title = document.createElement("div");
      title.className = "item-title";
      title.style.fontWeight = "600";
      title.style.fontSize = "14px"; // Texto más pequeño
      title.style.color = "#222";
      title.style.whiteSpace = "nowrap";
      title.style.overflow = "hidden";
      title.style.textOverflow = "ellipsis";
      title.textContent = expense.descripcion;

      titleContainer.appendChild(iconWrapper);
      titleContainer.appendChild(title);

      // Contenedor de fecha y categoría (más compacto)
      const metaContainer = document.createElement("div");
      metaContainer.style.display = "flex";
      metaContainer.style.alignItems = "center";
      metaContainer.style.gap = "8px"; // Menor separación
      metaContainer.style.fontSize = "12px"; // Texto más pequeño

      const fechaOriginal = expense.fecha;
      let fechaFormateada;
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaOriginal)) {
        const [year, month, day] = fechaOriginal.split("-");
        fechaFormateada = `${day}/${month}/${year}`;
      } else {
        fechaFormateada = fechaOriginal.split("T")[0];
      }

      const date = document.createElement("div");
      date.className = "item-subtitle";
      date.style.color = "#666";
      date.style.fontSize = "12px"; // Texto más pequeño
      date.style.display = "flex";
      date.style.alignItems = "center";
      date.style.gap = "4px"; // Menor separación

      date.innerHTML = `
        <i class="material-icons" style="font-size:12px; color:#666">event</i>
        <span>${fechaFormateada}</span>
      `;

      // Etiqueta de categoría (más compacta)
      const categoryTag = document.createElement("div");
      categoryTag.style.display = "flex";
      categoryTag.style.alignItems = "center";
      categoryTag.style.gap = "2px"; // Menor separación
      categoryTag.style.padding = "2px 6px"; // Padding reducido
      categoryTag.style.borderRadius = "4px";
      categoryTag.style.backgroundColor = `${this.getCategoryColor(expense.descripcion)}10`;
      categoryTag.style.color = this.getCategoryColor(expense.descripcion);
      categoryTag.style.fontSize = "11px"; // Texto más pequeño
      categoryTag.style.fontWeight = "500";

      const categoryIcon = document.createElement("i");
      categoryIcon.className = "material-icons";
      categoryIcon.style.fontSize = "12px"; // Icono más pequeño
      categoryIcon.textContent = "label";

      categoryTag.appendChild(categoryIcon);
      categoryTag.appendChild(
        document.createTextNode(this.getCategoryName(expense.descripcion))
      );

      metaContainer.appendChild(date);
      metaContainer.appendChild(categoryTag);

      leftContent.appendChild(titleContainer);
      leftContent.appendChild(metaContainer);

      const rightContent = document.createElement("div");
      rightContent.style.display = "flex";
      rightContent.style.alignItems = "center";
      rightContent.style.gap = "8px"; // Menor separación

      const amount = document.createElement("div");
      amount.className = "item-after";
      amount.style.color = "#e74c3c";
      amount.style.fontWeight = "700"; // Un poco menos grueso
      amount.style.fontSize = "14px"; // Texto más pequeño
      amount.style.minWidth = "70px"; // Ancho reducido
      amount.style.textAlign = "right";
      amount.textContent = `-$${expense.cantidad.toFixed(2)}`;

      // Botones de acción (más compactos)
      const actionsContainer = document.createElement("div");
      actionsContainer.style.display = "flex";
      actionsContainer.style.gap = "6px"; // Menor separación

      const editBtn = document.createElement("button");
      editBtn.className = "action-btn";
      editBtn.style.border = "none";
      editBtn.style.background = "none";
      editBtn.style.cursor = "pointer";
      editBtn.style.padding = "4px"; // Padding reducido
      editBtn.style.borderRadius = "4px";
      editBtn.style.color = "#00bcd4";
      editBtn.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
      editBtn.style.transition = "all 0.2s ease";
      editBtn.dataset.id = expense.id;
      editBtn.title = "Editar gasto";
      editBtn.tabIndex = "0";

        if (!isTouchDevice) {
        editBtn.addEventListener("mouseenter", () => {
          editBtn.style.backgroundColor = "rgba(0, 188, 212, 0.2)";
        });
        editBtn.addEventListener("mouseleave", () => {
          editBtn.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
        });
      }

      const editIcon = document.createElement("i");
      editIcon.className = "material-icons";
      editIcon.style.fontSize = "16px"; // Icono más pequeño
      editIcon.textContent = "edit";
      editBtn.appendChild(editIcon);

      // Botón de ver detalles (más compacto)
      const viewBtn = document.createElement("button");
      viewBtn.className = "action-btn";
      viewBtn.style.border = "none";
      viewBtn.style.background = "none";
      viewBtn.style.cursor = "pointer";
      viewBtn.style.padding = "4px"; // Padding reducido
      viewBtn.style.borderRadius = "4px";
      viewBtn.style.color = "#00bcd4";
      viewBtn.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
      viewBtn.style.transition = "all 0.2s ease";
      viewBtn.title = "Ver detalles";
      viewBtn.tabIndex = "0";

       if (!isTouchDevice) {
        viewBtn.addEventListener("mouseenter", () => {
          viewBtn.style.backgroundColor = "rgba(0, 188, 212, 0.2)";
        });
        viewBtn.addEventListener("mouseleave", () => {
          viewBtn.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
        });
      }

      const viewIcon = document.createElement("i");
      viewIcon.className = "material-icons";
      viewIcon.style.fontSize = "16px"; // Icono más pequeño
      viewIcon.textContent = "visibility";
      viewBtn.appendChild(viewIcon);

      actionsContainer.appendChild(editBtn);
      actionsContainer.appendChild(viewBtn);
      rightContent.appendChild(amount);
      rightContent.appendChild(actionsContainer);

      contentWrapper.appendChild(leftContent);
      contentWrapper.appendChild(rightContent);
      li.appendChild(contentWrapper);

      // Eventos (mantenidos igual)
      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.prepareEditExpenseForm(expense);
      });

      viewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showExpenseDetails(expense);
      });

      li.addEventListener("mousedown", (e) => {
        if (e.target === li) {
          e.preventDefault();
        }
      });

      listEl.appendChild(li);
    });

    // Animación de entrada (más rápida)
    setTimeout(() => {
      const items = listEl.querySelectorAll(".expense-item");
      items.forEach((item, index) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(10px)";
        item.style.transition = "opacity 0.3s ease, transform 0.3s ease";

        setTimeout(() => {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
        }, index * 60); // Tiempo reducido
      });
    }, 30); // Tiempo inicial reducido
},

  // Métodos auxiliares mejorados
  getExpenseIcon(description) {
    const lowerDesc = description.toLowerCase();
    if (/(comida|restaurante|almuerzo|cena|desayuno|menu)/.test(lowerDesc))
      return "restaurant";
    if (
      /(transporte|gasolina|auto|taxi|uber|movilización|bus|metro)/.test(
        lowerDesc
      )
    )
      return "directions_car";
    if (/(compras|super|mercado|tienda|supermercado|abastos)/.test(lowerDesc))
      return "shopping_cart";
    if (
      /(ocio|entretenimiento|cine|película|netflix|spotify|videojuegos|juegos|fiesta|bar)/.test(
        lowerDesc
      )
    )
      return "sports_esports";
    if (
      /(salud|farmacia|doctor|médico|hospital|clinica|remedio|medicina)/.test(
        lowerDesc
      )
    )
      return "local_hospital";
    if (
      /(ropa|zapatos|moda|vestido|jeans|accesorios|bolso|calzado)/.test(
        lowerDesc
      )
    )
      return "checkroom";
    if (
      /(casa|hogar|arriendo|hipoteca|muebles|decoración|electrodomésticos|jardín)/.test(
        lowerDesc
      )
    )
      return "home";
    if (
      /(educación|libro|curso|universidad|colegio|escuela|aprendizaje|capacitación)/.test(
        lowerDesc
      )
    )
      return "school";
    if (/(viaje|vacaciones|hotel|avion|turismo|pasaje)/.test(lowerDesc))
      return "flight";
    if (
      /(servicios|luz|agua|gas|internet|teléfono|televisión|streaming)/.test(
        lowerDesc
      )
    )
      return "receipt";
    if (/(regalo|cumpleaños|aniversario|navidad|obsequio)/.test(lowerDesc))
      return "card_giftcard";
    return "attach_money";
  },

  getCategoryColor(description) {
    const lowerDesc = description.toLowerCase();
    if (/(comida|restaurante|almuerzo|cena|desayuno)/.test(lowerDesc))
      return "#FF7043"; // Naranja
    if (/(transporte|gasolina|auto|taxi|uber)/.test(lowerDesc))
      return "#5C6BC0"; // Azul índigo
    if (/(compras|super|mercado|tienda)/.test(lowerDesc)) return "#66BB6A"; // Verde
    if (/(ocio|entretenimiento|cine|película|netflix)/.test(lowerDesc))
      return "#AB47BC"; // Púrpura
    if (/(salud|farmacia|doctor|médico)/.test(lowerDesc)) return "#EC407A"; // Rosa
    if (/(ropa|zapatos|moda|vestido)/.test(lowerDesc)) return "#26C6DA"; // Cyan
    if (/(casa|hogar|arriendo|hipoteca)/.test(lowerDesc)) return "#FFA726"; // Amber
    if (/(educación|libro|curso|universidad)/.test(lowerDesc)) return "#7E57C2"; // Violeta
    if (/(viaje|vacaciones|hotel|avion)/.test(lowerDesc)) return "#42A5F5"; // Azul claro
    if (/(servicios|luz|agua|gas|internet)/.test(lowerDesc)) return "#78909C"; // Azul grisáceo
    if (/(regalo|cumpleaños|aniversario)/.test(lowerDesc)) return "#FF6384"; // Rosa fuerte
    return "#78909C"; // Gris por defecto
  },

  getCategoryName(description) {
    const lowerDesc = description.toLowerCase();
    if (/(comida|restaurante|almuerzo|cena|desayuno)/.test(lowerDesc))
      return "Alimentación";
    if (/(transporte|gasolina|auto|taxi|uber)/.test(lowerDesc))
      return "Transporte";
    if (/(compras|super|mercado|tienda)/.test(lowerDesc)) return "Compras";
    if (/(ocio|entretenimiento|cine|película|netflix)/.test(lowerDesc))
      return "Entretenimiento";
    if (/(salud|farmacia|doctor|médico)/.test(lowerDesc)) return "Salud";
    if (/(ropa|zapatos|moda|vestido)/.test(lowerDesc)) return "Ropa";
    if (/(casa|hogar|arriendo|hipoteca)/.test(lowerDesc)) return "Hogar";
    if (/(educación|libro|curso|universidad)/.test(lowerDesc))
      return "Educación";
    if (/(viaje|vacaciones|hotel|avion)/.test(lowerDesc)) return "Viajes";
    if (/(servicios|luz|agua|gas|internet)/.test(lowerDesc)) return "Servicios";
    if (/(regalo|cumpleaños|aniversario)/.test(lowerDesc)) return "Regalos";
    return "Otros";
  },

  updateSummaryUI(summary) {
    // 1. Mostrar siempre el gasto de hoy
    document.getElementById(
      "today-expenses-amount"
    ).textContent = `$${summary.hoy.toFixed(2)}`;

    // 2. Manejar la visualización de la semana (SOLO para filtros "hoy" o "semana")
    const weekElement = document.getElementById("week-expenses");
    const weekLabel = weekElement.parentElement.querySelector("div");

    if (summary.currentFilter === "hoy" || summary.currentFilter === "semana") {
      weekElement.textContent = `$${summary.semana.toFixed(2)}`;
      weekElement.parentElement.style.display = "block";
      weekLabel.textContent =
        summary.currentFilter === "semana"
          ? "SEMANA SELECCIONADA"
          : "ESTA SEMANA";
    } else {
      weekElement.parentElement.style.display = "none"; // Ocultar cuando el filtro es "mes"
    }

    // 3. Mostrar siempre el mes (pero con label contextual)
    const monthElement = document.getElementById("month-expenses");
    const monthLabel = monthElement.parentElement.querySelector("div");

    monthElement.textContent = `$${summary.mes.toFixed(2)}`;
    monthElement.parentElement.style.display = "block";

    monthLabel.textContent =
      summary.currentFilter === "mes" ? "MES SELECCIONADO" : "ESTE MES";

    // 4. Barra de progreso diario (siempre visible)
    const percentage = (summary.hoy / this.dailyLimit) * 100;
    const progressBar = document.getElementById("limit-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${Math.min(percentage, 100)}%`;
      progressBar.style.backgroundColor =
        percentage > 100 ? "#e74c3c" : "#00bcd4";
    }

    // 5. Texto del límite diario
    const limitText = document.getElementById("daily-limit");
    limitText.innerHTML = `
    Límite diario: $${this.dailyLimit.toFixed(2)} 
    <span style="color: ${percentage > 100 ? "#e74c3c" : "#00bcd4"}">
      (${percentage.toFixed(0)}%)
    </span>
  `;
  },
  checkDailyLimit(todayTotal) {
    if (todayTotal > this.dailyLimit) {
      capacitorApp.checkAndNotifyExpenseLimit(todayTotal, this.dailyLimit);
    }
  },
  prepareEditExpenseForm(expense) {
    this.currentExpense = expense;

    document.getElementById("popup-title-expense").textContent = "Editar Gasto";
    document.getElementById("delete-btn-container-expenses").style.display =
      "block";
    document.getElementById("expense-id").value = expense.id;
    document.getElementById("expense-description").value = expense.descripcion;
    document.getElementById("expense-amount").value = expense.cantidad;

    // Corregir fecha al editar
    const fechaObj = new Date(expense.fecha);
    document.getElementById("expense-date").value = fechaObj
      .toISOString()
      .split("T")[0];

    this.app.popup.open(".expense-popup", true);
  },

  prepareNewExpenseForm() {
    this.currentExpense = null;
    document.getElementById("popup-title-expense").textContent = "Nuevo Gasto";
    document.getElementById("delete-btn-container-expenses").style.display =
      "none";
    document.getElementById("expense-id").value = "";
    document.getElementById("expense-description").value = "";
    document.getElementById("expense-amount").value = "";

    // Fecha actual en formato local correcto
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    document.getElementById("expense-date").value = localDate;
 console.log(localDate)
    this.app.popup.open(".expense-popup", true);
  },

  async saveExpense() {
    const id = document.getElementById("expense-id").value;
    const descripcion = document
      .getElementById("expense-description")
      .value.trim();
    const cantidad = parseFloat(
      document.getElementById("expense-amount").value
    );

    // Manejo correcto de la fecha
    const fechaInput = document.getElementById("expense-date").value;
    const fechaObj = new Date(fechaInput);
    const fechaISO = fechaObj.toISOString();
    if (!descripcion || isNaN(cantidad)) {
      this.app.dialog.alert(
        "Por favor complete todos los campos correctamente"
      );
      return;
    }

    try {
      const expenseData = { descripcion, cantidad, fecha: fechaISO };

      if (id) {
        expenseData.id = parseInt(id);
        await updateGasto(expenseData);

        this.app.toast
          .create({
            text: "Gasto actualizado con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      } else {
        await addGasto(expenseData);

        this.app.toast
          .create({
            text: "Gasto registrado con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      }

      this.app.popup.close(".expense-popup", true);
      await this.loadExpenses();
    } catch (error) {
      this.app.dialog.alert("Error al guardar gasto: " + error.message);
    }
  },

  async deleteExpense() {
    if (!this.currentExpense) return;

    try {
      await this.app.dialog.confirm(
        "¿Estás seguro de eliminar este gasto?",
        "Confirmar eliminación",
        async () => {
          await deleteGasto(this.currentExpense.id);

          this.app.toast
            .create({
              text: "Gasto eliminado con éxito",
              position: "center",
              closeTimeout: 1500,
            })
            .open();

          this.app.popup.close(".expense-popup", true);
          await this.loadExpenses();
        }
      );
    } catch (error) {
      this.app.dialog.alert("Error al eliminar gasto: " + error.message);
    }
  },
  showLoadingState(show) {
    const loadingEl = document.getElementById("loading-state-expense");
    if (loadingEl) loadingEl.style.display = show ? "block" : "none";
  },

  showEmptyState(show, isToday = true) {
    const emptyEl = document.getElementById("empty-state-expense");
    if (!emptyEl) return;

    if (show) {
      const message = isToday
        ? "No hay gastos registrados hoy"
        : "No hay gastos para el período seleccionado";

      emptyEl.innerHTML = `
      <div style="text-align: center; padding: 40px 16px;">
        <i class="icon material-icons" style="font-size: 48px; color: #ccc;">
          ${isToday ? "money_off" : "search_off"}
        </i>
        <p style="color: #777; margin: 16px 0;">${message}</p>
      </div>
    `;

      // Solo mostrar botón si es el estado de hoy
      if (isToday) {
        const btn = document.createElement("a");
        btn.href = "#";
        btn.className = "button button-fill button-round";
        btn.style.backgroundColor = "#00bcd4";
        btn.style.color = "white";
        btn.style.margin = "0 auto";
        btn.style.display = "block";
        btn.style.maxWidth = "200px";
        btn.innerHTML = '<i class="icon material-icons">add</i> Agregar gasto';

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.prepareNewExpenseForm();
        });

        emptyEl.querySelector("div").appendChild(btn);
      }
    }

    emptyEl.style.display = show ? "block" : "none";
  },

  showExpensesList(show) {
    const container = document.getElementById("expenses-list-container");
    if (container) {
      container.style.display = show ? "block" : "none";

      // Calcular altura dinámica considerando todos los elementos fijos
      const viewportHeight = window.innerHeight;
      const fixedElementsHeight =
        document.querySelector(".navbar").offsetHeight +
        document.querySelector(".card").offsetHeight +
        document.querySelector(".segmented").offsetHeight +
        document.querySelector(".filter-feedback").offsetHeight +
        80; // Reducimos el margen adicional de 100px a 80px (20px menos)

      const listContainer = container.querySelector(".card");
      if (listContainer) {
        const optimalHeight = Math.max(
          280,
          viewportHeight - fixedElementsHeight
        ); // Reducimos el mínimo de 300px a 280px
        listContainer.style.height = `${optimalHeight}px`;

        // Asegurar que el scroll interno funcione correctamente
        const innerList = listContainer.querySelector(".list.media-list");
        innerList.style.height = "100%";
        innerList.style.maxHeight = "none";
      }
    }

    // Mantener compatibilidad
    const listEl = document.getElementById("expenses-list")?.parentElement;
    if (listEl) listEl.style.display = show ? "block" : "none";
  },
  // Método para mostrar detalles del gasto
showExpenseDetails(expense) {
    if (!expense) return;

    // Obtener color de categoría
    const categoryColor = this.getCategoryColor(expense.descripcion);
    
    // Convertir color HEX a RGB para el fondo semi-transparente
    const hexToRgb = hex => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };
    
    // Configurar el círculo del icono
    const iconCircle = document.querySelector('.view-expense-popup .block div[style*="background"]');
    iconCircle.style.setProperty('--category-color-rgb', hexToRgb(categoryColor));
    iconCircle.style.border = `2px solid ${categoryColor}`;

    document.getElementById("view-expense-icon").innerHTML = 
      `<i class="material-icons" style="color: ${categoryColor}">
        ${this.getExpenseIcon(expense.descripcion)}
      </i>`;

    document.getElementById("view-expense-amount").textContent = 
      `-$${expense.cantidad.toFixed(2)}`;
    document.getElementById("view-expense-amount").style.color = categoryColor;

    document.getElementById("view-expense-category").textContent = 
      this.getCategoryName(expense.descripcion);
    document.getElementById("view-expense-category").style.color = categoryColor;

    document.getElementById("view-expense-description").textContent = 
      expense.descripcion || "Sin descripción";

    // Formatear fecha
    const dateObj = expense.fecha.split('T')[0];
    const [year, month, day] = dateObj.split("-");
    const formattedDate = `${day}/${month}/${year}`;

    document.getElementById("view-expense-date").textContent = formattedDate;

    // Abrir popup
    this.app.popup.open(".view-expense-popup", true);

    // Configurar cierre
    const closeButtons = document.querySelectorAll('.view-expense-popup .popup-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.app.popup.close('.view-expense-popup');
      });
    });
},
};

window.expensesManager = ExpensesManager;
