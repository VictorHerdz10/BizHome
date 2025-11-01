import {
  addVenta,
  getVentas,
  getRetencionesAcumuladas,
  deleteVenta,
  getVentaById,
  updateVenta,
} from "../database/sales.js";
import {
  getProducts,
  getProductStock,
  updateStock,
} from "../database/products.js";

export const SalesManager = {
  app: null,
  currentSale: null,
  selectedDate: null,
  selectedWeek: null,
  selectedMonth: null,

  init(app) {
    this.app = app;
    this.bindEvents();
    this.setupWeekFilter();
    this.setupMonthFilter();
    this.loadSales();
    this.loadProductsForSelector();
  },

  bindEvents() {
    document.getElementById("add-sale-btn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.prepareNewSaleForm();
    });

    document.getElementById("add-sale-fab")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.prepareNewSaleForm();
    });

    document
      .getElementById("save-sale-btn")
      ?.addEventListener("click", () => this.saveSale());
    document
      .getElementById("delete-sale-btn")
      ?.addEventListener("click", () => this.deleteSale());

    // Filtros
    document
      .getElementById("filter-today-sales")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadSales("hoy");
      });

    document
      .getElementById("filter-week-sales")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadSales("semana");
        document.getElementById("week-filter-input-sales").click();
      });

    document
      .getElementById("filter-month-sales")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadSales("mes");
        document.getElementById("month-filter-input-sales").click();
      });
    document
      .getElementById("sale-product")
      .addEventListener("change", () => this.updateProductInfo());
    document
      .getElementById("sale-quantity")
      .addEventListener("input", () => this.calculateTotal());
    document
      .getElementById("info-button-sales")
      ?.addEventListener("click", (e) => {
        e.preventDefault();

        this.app.popup.open(".info-popup-sales", {
          animate: true,
          on: {
            open: function () {
              // Forzar repintado para que funcionen las animaciones
              setTimeout(() => {
                document
                  .querySelectorAll(".info-popup-sales .animate__animated")
                  .forEach((el) => {
                    el.style.opacity = "1";
                  });
              }, 50);
            },
          },
        });
      });
  },

  async loadProductsForSelector() {
    try {
      const products = await getProducts();
      const selector = document.getElementById("sale-product");

      if (selector) {
        // Limpiar y agregar opción por defecto
        selector.innerHTML =
          '<option value="" disabled selected>Seleccione un producto</option>';

        // Agregar productos
        products.forEach((product) => {
          const option = document.createElement("option");
          option.value = product.id;
          option.dataset.stock = product.stock;
          option.dataset.price = product.precio_venta;
          option.dataset.unit = product.tipo_unidad;
          option.textContent = product.nombre;
          selector.appendChild(option);
        });

        this.updateProductInfo();
      }
    } catch (error) {
      console.error("Error loading products:", error);
      this.updateProductInfo();
    }
  },

  updateProductInfo() {
    const productSelect = document.getElementById("sale-product");
    if (!productSelect || productSelect.options.length === 0) {
      // Si no hay productos cargados, establecemos valores por defecto
      document.getElementById("sale-stock").textContent = "Stock disponible: 0";
      document.getElementById("sale-unit-price").textContent =
        "Precio unitario: $0.00";
      document.getElementById("sale-quantity").max = 0;
      document.getElementById("sale-quantity").value = "";
      document.getElementById("sale-total").textContent = "$0.00";
      return;
    }

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const stock = parseFloat(selectedOption.getAttribute("data-stock")) || 0;
    const price = parseFloat(selectedOption.getAttribute("data-price")) || 0;

    document.getElementById(
      "sale-stock"
    ).textContent = `Stock disponible: ${stock}`;
    document.getElementById(
      "sale-unit-price"
    ).textContent = `Precio unitario: $${price.toFixed(2)}`;
    document.getElementById("sale-quantity").max = stock;
    document.getElementById("sale-quantity").value = "";
    document.getElementById("sale-total").textContent = "$0.00";
  },

  calculateTotal() {
    const quantity =
      parseFloat(document.getElementById("sale-quantity").value) || 0;
    const selectedOption =
      document.getElementById("sale-product").options[
        document.getElementById("sale-product").selectedIndex
      ];
    const price = parseFloat(selectedOption.getAttribute("data-price"));

    const total = quantity * price;
    document.getElementById("sale-total").textContent = `$${total.toFixed(2)}`;
  },

  async loadSales(filter = "hoy", customDate = null) {
    try {
      this.showLoadingState(true);
      this.updateFilterFeedback(filter, customDate);

      const allSales = await getVentas();
      let filteredSales = [];

      switch (filter) {
        case "hoy":
          filteredSales = this.filterSales(allSales, "hoy");
          break;

        case "semana":
          if (customDate && customDate.start && customDate.end) {
            filteredSales = this.filterSales(allSales, "semana", customDate);
          } else {
            const weekRange = this.getWeekRange(
              this.formatLocalDate(new Date())
            );
            filteredSales = this.filterSales(allSales, "semana", weekRange);
            customDate = weekRange;
          }
          break;

        case "mes":
          if (customDate) {
            filteredSales = this.filterSales(allSales, "mes", customDate);
          } else {
            const currentMonth = new Date()
              .toISOString()
              .split("T")[0]
              .substring(0, 7);
            filteredSales = this.filterSales(allSales, "mes", currentMonth);
            customDate = currentMonth;
          }
          break;

        default:
          filteredSales = allSales;
      }

      const summary = this.calculateSummary(allSales, filter, customDate);
      const retenciones = await getRetencionesAcumuladas();

      if (filteredSales.length === 0) {
        this.showEmptyState(true, filter === "hoy");
        this.showSalesList(false);
      } else {
        this.showEmptyState(false);
        this.renderSales(filteredSales);
        this.showSalesList(true);
      }

      this.updateSummaryUI(summary, retenciones);
    } catch (error) {
      console.error("Error loading sales:", error);
      this.app.dialog.alert("Error al cargar ventas: " + error.message);
    } finally {
      this.showLoadingState(false);
    }
  },
  calculateSummary(sales, filter, customDate) {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = todayStr.substring(0, 7);

    // 1. Calcular siempre las ventas de hoy
    const hoy = {
      total: sales
        .filter((s) => s.fecha.split("T")[0] === todayStr)
        .reduce((sum, s) => sum + s.total, 0),
      ganancia: sales
        .filter((s) => s.fecha.split("T")[0] === todayStr)
        .reduce((sum, s) => sum + s.ganancia_neta, 0),
    };

    // 2. Calcular semana según filtro
    let semanaRange =
      filter === "semana" && customDate?.start && customDate?.end
        ? customDate
        : this.getWeekRange(todayStr);

    const semana = {
      total: sales
        .filter((s) => {
          const saleDate = s.fecha.split("T")[0];
          return saleDate >= semanaRange.start && saleDate <= semanaRange.end;
        })
        .reduce((sum, s) => sum + s.total, 0),
      ganancia: sales
        .filter((s) => {
          const saleDate = s.fecha.split("T")[0];
          return saleDate >= semanaRange.start && saleDate <= semanaRange.end;
        })
        .reduce((sum, s) => sum + s.ganancia_neta, 0),
    };

    // 3. Calcular mes según filtro
    const mesRange = filter === "mes" ? customDate : currentMonth;
    const mes = {
      total: sales
        .filter((s) => s.fecha.split("T")[0].substring(0, 7) === mesRange)
        .reduce((sum, s) => sum + s.total, 0),
      ganancia: sales
        .filter((s) => s.fecha.split("T")[0].substring(0, 7) === mesRange)
        .reduce((sum, s) => sum + s.ganancia_neta, 0),
    };

    return { hoy, semana, mes };
  },
  filterSales(sales, filter, customDate = null) {
    // Obtener fecha actual LOCAL (sin ajustes de UTC)
    const today = new Date();
    const todayLocalStr = this.formatLocalDate(today);

    return sales.filter((sale) => {
      // Parsear fecha de la venta como local
      const saleDate = this.parseLocalDate(sale.fecha.split("T")[0]);
      const saleDateStr = this.formatLocalDate(saleDate);

      switch (filter) {
        case "hoy":
          return saleDateStr === todayLocalStr;

        case "semana":
          if (customDate && customDate.start && customDate.end) {
            const start = this.parseLocalDate(customDate.start);
            const end = this.parseLocalDate(customDate.end);
            return saleDate >= start && saleDate <= end;
          } else {
            const weekRange = this.getWeekRange(todayLocalStr);
            const weekStart = this.parseLocalDate(weekRange.start);
            const weekEnd = this.parseLocalDate(weekRange.end);
            return saleDate >= weekStart && saleDate <= weekEnd;
          }

        case "mes":
          if (customDate) {
            const [year, month] = customDate.split("-");
            return (
              saleDate.getFullYear() === parseInt(year) &&
              saleDate.getMonth() + 1 === parseInt(month)
            );
          }
          return (
            saleDate.getFullYear() === today.getFullYear() &&
            saleDate.getMonth() === today.getMonth()
          );

        default:
          return true;
      }
    });
  },

  renderSales(sales) {
    const listEl = document.getElementById("sales-list");
    listEl.innerHTML = "";

    sales.forEach((sale) => {
      const li = document.createElement("li");
      li.className = "sale-item";
      li.style.padding = "14px 12px";
      li.style.marginBottom = "8px";
      li.style.borderRadius = "10px";
      li.style.backgroundColor = "#fff";
      li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.transition = "all 0.3s ease";
      li.style.borderLeft = "4px solid #2ecc71";

      // Efecto hover
      li.addEventListener("mouseenter", () => {
        li.style.transform = "translateY(-2px)";
        li.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      });
      li.addEventListener("mouseleave", () => {
        li.style.transform = "none";
        li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
      });

      const leftContent = document.createElement("div");
      leftContent.style.flex = "1";
      leftContent.style.minWidth = "0";

      const titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.marginBottom = "4px";
      titleContainer.style.gap = "8px";

      const icon = document.createElement("i");
      icon.className = "material-icons";
      icon.style.color = "#2ecc71";
      icon.style.fontSize = "18px";
      icon.textContent = "shopping_cart";

      const title = document.createElement("div");
      title.className = "item-title";
      title.style.fontWeight = "600";
      title.style.fontSize = "15px";
      title.style.color = "#333";
      title.textContent = sale.producto_nombre;

      titleContainer.appendChild(icon);
      titleContainer.appendChild(title);

      const details = document.createElement("div");
      details.className = "item-subtitle";
      details.style.color = "#777";
      details.style.fontSize = "12px";
      details.style.display = "flex";
      details.style.flexWrap = "wrap";
      details.style.gap = "8px";

      const quantity = document.createElement("span");
      quantity.innerHTML = `<i class="material-icons" style="font-size:12px">exposure</i> ${sale.cantidad} ${sale.tipo_unidad}`;

      const fechaOriginal = sale.fecha;
      let fechaFormateada;
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaOriginal)) {
        const [year, month, day] = fechaOriginal.split("-");
        fechaFormateada = `${day}/${month}/${year}`;
      } else {
        fechaFormateada = fechaOriginal;
      }
      const date = document.createElement("span");
      date.innerHTML = `<i class="material-icons" style="font-size:12px">event</i> ${fechaFormateada}`;

      const profit = document.createElement("span");
      profit.innerHTML = `<i class="material-icons" style="font-size:12px">trending_up</i> Ganancia: $${sale.ganancia_neta.toFixed(
        2
      )}`;

      details.appendChild(quantity);
      details.appendChild(date);
      details.appendChild(profit);

      leftContent.appendChild(titleContainer);
      leftContent.appendChild(details);

      const rightContent = document.createElement("div");
      rightContent.style.display = "flex";
      rightContent.style.alignItems = "center";
      rightContent.style.gap = "12px";

      const amount = document.createElement("div");
      amount.className = "item-after";
      amount.style.color = "#2ecc71";
      amount.style.fontWeight = "700";
      amount.style.fontSize = "15px";
      amount.style.minWidth = "70px";
      amount.style.textAlign = "right";
      amount.textContent = `$${sale.total.toFixed(2)}`;

      const editBtn = document.createElement("a");
      editBtn.href = "#";
      editBtn.className = "link";
      editBtn.style.color = "#00bcd4";
      editBtn.style.display = "flex";
      editBtn.style.alignItems = "center";
      editBtn.style.justifyContent = "center";
      editBtn.style.width = "32px";
      editBtn.style.height = "32px";
      editBtn.style.borderRadius = "50%";
      editBtn.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
      editBtn.dataset.id = sale.id;
      editBtn.title = "Editar venta";

      const editIcon = document.createElement("i");
      editIcon.className = "material-icons";
      editIcon.style.fontSize = "18px";
      editIcon.textContent = "edit";

      editBtn.appendChild(editIcon);
      rightContent.appendChild(amount);
      rightContent.appendChild(editBtn);
      li.appendChild(leftContent);
      li.appendChild(rightContent);

      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareEditSaleForm(sale);
      });

      listEl.appendChild(li);
    });
  },

  updateSummaryUI(summary, retenciones) {
    // Manejar valores nulos o indefinidos
    const safeToFixed = (value) => (value ? value.toFixed(2) : "0.00");

    document.getElementById("today-sales-amount").textContent = `$${safeToFixed(
      summary?.hoy?.total
    )}`;
    document.getElementById("today-sales-profit").textContent = `$${safeToFixed(
      summary?.hoy?.ganancia
    )}`;

    document.getElementById("week-sales-amount").textContent = `$${safeToFixed(
      summary?.semana?.total
    )}`;
    document.getElementById("week-sales-profit").textContent = `$${safeToFixed(
      summary?.semana?.ganancia
    )}`;

    document.getElementById("month-sales-amount").textContent = `$${safeToFixed(
      summary?.mes?.total
    )}`;
    document.getElementById("month-sales-profit").textContent = `$${safeToFixed(
      summary?.mes?.ganancia
    )}`;

    document.getElementById("total-retentions").textContent = `$${safeToFixed(
      retenciones
    )}`;
  },

  async prepareEditSaleForm(sale) {
    try {
      this.currentSale = sale;
      document.getElementById("popup-title-sale").textContent = "Editar Venta";
      document.getElementById("delete-btn-container-sales").style.display =
        "block";
      document.getElementById("sale-id").value = sale.id;

      // Primero cargamos los productos
      await this.loadProductsForSelector();

      // Seleccionar el producto después de que se hayan cargado
      const productSelect = document.getElementById("sale-product");
      if (productSelect && productSelect.options.length > 0) {
        for (let i = 0; i < productSelect.options.length; i++) {
          if (parseInt(productSelect.options[i].value) === sale.producto_id) {
            productSelect.selectedIndex = i;
            break;
          }
        }

        // Actualizar la información del producto seleccionado
        const selectedOption =
          productSelect.options[productSelect.selectedIndex];
        document.getElementById(
          "sale-stock"
        ).textContent = `Stock disponible: ${parseFloat(
          selectedOption.getAttribute("data-stock")
        )}`;
        document.getElementById(
          "sale-unit-price"
        ).textContent = `Precio unitario: $${sale.precio_unitario.toFixed(2)}`;
        document.getElementById("sale-quantity").value = sale.cantidad;
        document.getElementById(
          "sale-total"
        ).textContent = `$${sale.total.toFixed(2)}`;

        // Ajustar el máximo permitido para la cantidad (stock actual + cantidad vendida)
        document.getElementById("sale-quantity").max =
          parseFloat(selectedOption.getAttribute("data-stock")) + sale.cantidad;
      }

      this.app.popup.open(".sale-popup", true);
    } catch (error) {
      console.error("Error preparing edit form:", error);
      this.app.dialog.alert("Error al preparar el formulario de edición");
    }
  },

  prepareNewSaleForm() {
    this.currentSale = null;
    document.getElementById("popup-title-sale").textContent = "Nueva Venta";
    document.getElementById("delete-btn-container-sales").style.display =
      "none";
    document.getElementById("sale-id").value = "";
    document.getElementById("sale-quantity").value = "";
    document.getElementById("sale-total").textContent = "$0.00";

    // Fecha actual en formato local correcto (igual que en expensesManager)
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    this.currentSale = { fecha: localDate };
    // Primero cargamos los productos y luego abrimos el popup
    this.loadProductsForSelector().then(() => {
      this.app.popup.open(".sale-popup", true);
    });
  },

  async updateProductStock(productId, quantityChange) {
    try {
      await updateStock(productId, quantityChange);
      return true;
    } catch (error) {
      console.error("Error updating stock:", error);
      return false;
    }
  },

  async saveSale() {
    const id = document.getElementById("sale-id").value;
    const productId = document.getElementById("sale-product").value;
    const quantity = parseFloat(document.getElementById("sale-quantity").value);
    const selectedOption =
      document.getElementById("sale-product").options[
        document.getElementById("sale-product").selectedIndex
      ];
    const price = parseFloat(selectedOption.getAttribute("data-price"));
    const currentStock = parseFloat(selectedOption.getAttribute("data-stock"));

    if (!productId || isNaN(quantity) || quantity <= 0) {
      this.app.dialog.alert("Por favor ingrese una cantidad válida");
      return;
    }

    try {
      const saleData = {
        producto_id: parseInt(productId),
        cantidad: quantity,
        precio_unitario: price,
      };

      if (id) {
        // Lógica para edición
        const oldSale = await getVentaById(id);
        const quantityDifference = quantity - oldSale.cantidad;

        // Verificar stock solo si estamos aumentando la cantidad
        if (quantityDifference > 0) {
          if (quantityDifference > currentStock) {
            this.app.dialog.alert(
              `No hay suficiente stock para la actualización. Disponible: ${currentStock}`
            );
            return;
          }
        }

        // Actualizar el stock con la diferencia (puede ser positivo o negativo)
        await this.updateProductStock(productId, -quantityDifference);

        // Actualizar la venta
        saleData.id = parseInt(id);
        await updateVenta(saleData);

        this.app.toast
          .create({
            text: "Venta actualizada con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      } else {
        // Lógica para nueva venta
        if (quantity > currentStock) {
          this.app.dialog.alert(
            `No hay suficiente stock. Disponible: ${currentStock}`
          );
          return;
        }

        saleData.fecha = this.currentSale.fecha;
        await addVenta(saleData);
        await this.updateProductStock(productId, -quantity);

        this.app.toast
          .create({
            text: "Venta registrada con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      }

      this.app.popup.close(".sale-popup", true);
      await this.loadSales();
      await this.loadProductsForSelector();
    } catch (error) {
      this.app.dialog.alert("Error al guardar venta: " + error.message);
    }
  },

  async deleteSale() {
    if (!this.currentSale) return;

    try {
      await this.app.dialog.confirm(
        "¿Estás seguro de eliminar esta venta? Se restablecerá el stock.",
        "Confirmar eliminación",
        async () => {
          try {
            // Restaurar el stock (sumamos la cantidad eliminada)
            await this.updateProductStock(
              this.currentSale.producto_id,
              +this.currentSale.cantidad
            );

            // Eliminar la venta
            await deleteVenta(this.currentSale.id);

            this.app.toast
              .create({
                text: "Venta eliminada y stock restaurado correctamente",
                position: "center",
                closeTimeout: 1500,
              })
              .open();

            this.app.popup.close(".sale-popup", true);
            await this.loadSales();
            await this.loadProductsForSelector();
          } catch (error) {
            console.error("Error en el proceso de eliminación:", error);
            this.app.dialog.alert("Error al eliminar venta: " + error.message);
          }
        }
      );
    } catch (error) {
      this.app.dialog.alert("Error al confirmar eliminación: " + error.message);
    }
  },

  showLoadingState(show) {
    const loadingEl = document.getElementById("loading-state-sale");
    if (loadingEl) loadingEl.style.display = show ? "block" : "none";
  },

  showEmptyState(show, isToday = true) {
    const emptyEl = document.getElementById("empty-state-sale");
    if (!emptyEl) return;

    if (show) {
      const message = isToday
        ? "No hay ventas registradas hoy"
        : "No hay ventas para el período seleccionado";

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
        btn.innerHTML =
          '<i class="icon material-icons">add</i> Registrar venta';

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          this.prepareNewSaleForm();
        });

        emptyEl.querySelector("div").appendChild(btn);
      }
    }

    emptyEl.style.display = show ? "block" : "none";
  },
  showSalesList(show) {
    const container = document.getElementById("sales-list-container");
    if (container) {
      container.style.display = show ? "block" : "none";
      // Ajustar dinámicamente la altura máxima
      const viewportHeight = window.innerHeight;
      const listContainer = container.querySelector(".list.media-list");
      if (listContainer) {
        listContainer.style.maxHeight = `${Math.min(
          viewportHeight * 0.45,
          400
        )}px`;
      }
    }
  },
  setupWeekFilter() {
    this.app.calendar.create({
      inputEl: "#week-filter-input-sales",
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
            this.loadSales("semana", this.selectedWeek);

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
      inputEl: "#month-filter-input-sales",
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
            this.loadSales("mes", this.selectedMonth);

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
    document.getElementById("date-filter-input-sales").click();
  },

  updateFilterFeedback(filter, customDate = null) {
    const feedbackEl = document.getElementById("filter-feedback-text-sales");
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
};

window.SalesManager = SalesManager;
