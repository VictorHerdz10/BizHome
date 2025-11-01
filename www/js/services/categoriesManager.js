import { getProductsByCategory } from "../database/categories.js";

export const CategoriesManager = {
  app: null,
  currentCategory: null,
 icons: [
  // Iconos base para categorías genéricas
  "fa-layer-group",          // Agrupación (mejor que "folder")
  "fa-boxes",                // Contenedor de items
  "fa-tags",                 // Etiquetas (categorización)
  "fa-sitemap",              // Estructura jerárquica
  "fa-filter",               // Filtros
  "fa-network-wired",        // Conexiones
  "fa-project-diagram",      // Organización
  
  // Categorías por tipo de producto
  "fa-microchip",            // Tecnología/Electrónicos
  "fa-tshirt",               // Ropa/Moda
  "fa-utensils",             // Alimentos/Hogar
  "fa-pills",                // Salud/Farmacia
  "fa-book",                 // Libros/Educación
  "fa-tools",                // Herramientas
  "fa-futbol",               // Deportes
  "fa-paw",                  // Mascotas
  "fa-car",                  // Automotriz
  "fa-baby",                 // Bebés
  "fa-gem",                  // Joyería/Lujo
  "fa-leaf",                 // Naturaleza/Jardín
  "fa-couch",                // Muebles/Hogar
  "fa-plane",                // Viajes
  "fa-gift",                 // Regalos
  
  // Iconos para operaciones comerciales
  "fa-cash-register",        // Ventas
  "fa-warehouse",            // Inventario
  "fa-truck",                // Logística
  "fa-chart-line",           // Análisis
  "fa-users",                // Clientes
  "fa-store",                // Puntos de venta
  
  // Estados especiales
  "fa-star",                 // Destacados
  "fa-fire",                 // Populares
  "fa-percentage",           // Descuentos/Ofertas
  "fa-clock",                // Recientes
  "fa-ban"                   // Excluidos
],

  init(app) {
    this.app = app;
    this.bindEvents();
    this.setupIconSelector();
  },

  bindEvents() {
    // Botón de agregar en el estado vacío
    document
      .getElementById("add-category-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewCategoryForm();
      });

    // Botón flotante de agregar
    document
      .getElementById("add-category-fab")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewCategoryForm();
      });

    // Botón de guardar
    document
      .getElementById("save-category-btn")
      ?.addEventListener("click", () => this.saveCategory());

    // Botón de eliminar
    document
      .getElementById("delete-category-btn")
      ?.addEventListener("click", () => this.deleteCategory());

    // Selector de ícono
   document
  .getElementById("category-icon")
  ?.addEventListener("change", (e) => {
    const iconPreview = document.getElementById("icon-preview");
    // Primero removemos todas las clases fa-*
    Array.from(iconPreview.classList).forEach(className => {
      if (className.startsWith('fa-')) {
        iconPreview.classList.remove(className);
      }
    });
    // Luego agregamos la nueva clase
    iconPreview.classList.add('fas', e.target.value);
  });

   document.getElementById("info-button")?.addEventListener("click", (e) => {
    e.preventDefault();
    this.app.popup.open(".info-popup", {
      animate: true,
      on: {
        open: function() {
          // Forzar repintado para que funcionen las animaciones
          setTimeout(() => {
            document.querySelectorAll('.animate__animated').forEach(el => {
              el.style.opacity = '1';
            });
          }, 50);
        }
      }
    });
  });
},

setupIconSelector() {
  const iconSelector = document.getElementById("category-icon");
  if (!iconSelector) return;

  // Mapeo completo de íconos a español (Font Awesome)
  const iconTranslations = {
    // Iconos base
    "fa-layer-group": "Agrupación",
    "fa-boxes": "Contenedor múltiple",
    "fa-tags": "Etiquetas",
    "fa-sitemap": "Estructura",
    "fa-filter": "Filtro",
    "fa-network-wired": "Conexiones",
    "fa-project-diagram": "Organización",
    
    // Categorías por tipo
    "fa-microchip": "Tecnología",
    "fa-tshirt": "Ropa",
    "fa-utensils": "Alimentos",
    "fa-pills": "Salud",
    "fa-book": "Libros",
    "fa-tools": "Herramientas",
    "fa-futbol": "Deportes",
    "fa-paw": "Mascotas",
    "fa-car": "Automotriz",
    "fa-baby": "Bebés",
    "fa-gem": "Joyería",
    "fa-leaf": "Jardín",
    "fa-couch": "Hogar",
    "fa-plane": "Viajes",
    "fa-gift": "Regalos",
    
    // Operaciones
    "fa-cash-register": "Ventas",
    "fa-warehouse": "Inventario",
    "fa-truck": "Logística",
    "fa-chart-line": "Análisis",
    "fa-users": "Clientes",
    "fa-store": "Tienda",
    
    // Estados
    "fa-star": "Destacados",
    "fa-fire": "Populares",
    "fa-percentage": "Ofertas",
    "fa-clock": "Recientes",
    "fa-ban": "Excluidos"
  };

  iconSelector.innerHTML = this.icons
    .map(
      (icon) =>
        `<option value="${icon}">${iconTranslations[icon] || icon.replace('fa-', '')}</option>`
    )
    .join("");
},

  async loadCategories() {
    try {
      this.showLoadingState(true);

      await this.app.store.dispatch("refreshCategories");
      const categories = this.app.store.getters.categories.value;

      if (categories.length === 0) {
        this.showEmptyState(true);
        this.showCategoriesList(false);
      } else {
        this.showEmptyState(false);
        this.renderCategories(categories);
        this.showCategoriesList(true);
      }
    } catch (error) {
      this.app.dialog.alert("Error al cargar categorías: " + error.message);
    } finally {
      this.showLoadingState(false);
    }
  },

renderCategories(categories) {
  const listEl = document.getElementById("categories-list");
  listEl.innerHTML = "";

  const card = document.createElement("div");
  card.className = "card";
  card.style.borderRadius = "12px";
  card.style.boxShadow = "0 2px 10px rgba(0,188,212,0.1)";
  card.style.marginBottom = "20px";

  const cardContent = document.createElement("div");
  cardContent.className = "card-content card-content-padding";
  cardContent.style.padding = "0";

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "0";
  ul.style.margin = "0";

  categories.forEach((category, index) => {
    const li = document.createElement("li");
    li.className = "category-item";
    li.style.padding = "12px 16px";
    li.style.borderBottom = "1px solid #eee";
    li.style.display = "flex";
    li.style.flexDirection = "column";
    li.style.cursor = "pointer";

    // Contenedor principal
    const mainContent = document.createElement("div");
    mainContent.style.display = "flex";
    mainContent.style.alignItems = "center";
    mainContent.style.justifyContent = "space-between";

    // Parte izquierda (icono + nombre)
    const leftContent = document.createElement("div");
    leftContent.style.display = "flex";
    leftContent.style.alignItems = "center";
    leftContent.style.flex = "1";

    const icon = document.createElement("i");
    icon.className = `icon fas ${category.icono || "fa-layer-group"}`;
    icon.style.color = this.getRandomColor();
    icon.style.marginRight = "12px";
    icon.style.fontSize = "20px";

    const name = document.createElement("span");
    name.style.fontWeight = "500";
    name.style.fontSize = "14px";
    name.textContent = category.nombre;

    leftContent.appendChild(icon);
    leftContent.appendChild(name);

    // Parte derecha (contador + flecha)
    const rightContent = document.createElement("div");
    rightContent.style.display = "flex";
    rightContent.style.alignItems = "center";

    const countBadge = document.createElement("span");
    countBadge.className = "badge";
    countBadge.style.backgroundColor = "#e0f7fa";
    countBadge.style.color = "#00838f";
    countBadge.style.fontWeight = "500";
    countBadge.style.padding = "2px 8px";
    countBadge.style.borderRadius = "10px";
    countBadge.style.marginRight = "12px";
    countBadge.style.fontSize = "12px";
    countBadge.textContent = category.cantidad_productos || 0;

    const arrowIcon = document.createElement("i");
    arrowIcon.className = "icon fas fa-chevron-down toggle-arrow";
    arrowIcon.style.color = "#00bcd4";
    arrowIcon.style.transition = "transform 0.3s";

    rightContent.appendChild(countBadge);
    rightContent.appendChild(arrowIcon);

    mainContent.appendChild(leftContent);
    mainContent.appendChild(rightContent);

    // Contenido desplegable
    const expandableContent = document.createElement("div");
    expandableContent.className = "category-expandable";
    expandableContent.style.display = "none";
    expandableContent.style.paddingTop = "10px";
    expandableContent.style.marginLeft = "32px";

    // Descripción
    const description = document.createElement("div");
    description.style.color = "#666";
    description.style.fontSize = "13px";
    description.style.marginBottom = "8px";
    description.textContent = category.descripcion || "Sin descripción";

    // Botón editar
    const editLink = document.createElement("a");
    editLink.href = "#";
    editLink.className = "link";
    editLink.style.color = "#00bcd4";
    editLink.style.fontSize = "13px";
    editLink.style.display = "inline-flex";
    editLink.style.alignItems = "center";
    editLink.dataset.id = category.id;

    const editIcon = document.createElement("i");
    editIcon.className = "icon fas fa-edit";
    editIcon.style.fontSize = "16px";
    editIcon.style.marginRight = "4px";

    const editText = document.createElement("span");
    editText.textContent = "Editar";

    editLink.appendChild(editIcon);
    editLink.appendChild(editText);

    expandableContent.appendChild(description);
    expandableContent.appendChild(editLink);

    li.appendChild(mainContent);
    li.appendChild(expandableContent);

    // Evento click para expandir/colapsar
    li.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.closest("a")) {
        return;
      }

      const isExpanded = expandableContent.style.display === "block";
      expandableContent.style.display = isExpanded ? "none" : "block";
      arrowIcon.className = isExpanded ? "icon fas fa-chevron-down toggle-arrow" : "icon fas fa-chevron-up toggle-arrow";
    });

    // Evento para el botón editar
    editLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.prepareEditCategoryForm(category);
    });

    ul.appendChild(li);
  });

  cardContent.appendChild(ul);
  card.appendChild(cardContent);
  listEl.appendChild(card);

  if (categories.length > 0) {
    const firstItem = listEl.querySelector(".category-item");
    if (firstItem) {
      firstItem.querySelector(".category-expandable").style.display = "block";
      firstItem.querySelector(".toggle-arrow").className = "icon fas fa-chevron-up toggle-arrow";
    }
  }
},
  // Función auxiliar para colores aleatorios
  getRandomColor() {
    const colors = [
      "#00bcd4",
      "#4caf50",
      "#ff9800",
      "#e91e63",
      "#9c27b0",
      "#3f51b5",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

prepareNewCategoryForm() {
  this.currentCategory = null;
  const popup = this.app.popup.get(".category-popup");

  document.getElementById("popup-title-category").textContent = "Nueva Categoría";
  document.getElementById("delete-btn-container-category").style.display = "none";
  document.getElementById("products-header").style.display = "none";
  document.getElementById("products-list-by-category").style.display = "none";
  document.getElementById("category-id").value = "";
  document.getElementById("category-name").value = "";
  document.getElementById("category-description").value = "";
  document.getElementById("category-icon").value = "fa-layer-group";
  
  const iconPreview = document.getElementById("icon-preview");
  iconPreview.className = "icon fas fa-layer-group";
  iconPreview.style.fontSize = "24px";

  this.app.popup.open(".category-popup", true);
},

async prepareEditCategoryForm(category) {
  this.currentCategory = category;
  const popup = this.app.popup.get(".category-popup");

  document.getElementById("popup-title-category").textContent = "Editar Categoría";
  document.getElementById("delete-btn-container-category").style.display = "block";
  document.getElementById("products-header").style.display = "block";
  document.getElementById("products-list-by-category").style.display = "block";
  document.getElementById("category-id").value = category.id;
  document.getElementById("category-name").value = category.nombre;
  document.getElementById("category-description").value =
    category.descripcion || "";
  document.getElementById("category-icon").value = category.icono || "fa-layer-group";
  
  const iconPreview = document.getElementById("icon-preview");
  iconPreview.className = `icon fas ${category.icono || "fa-layer-group"}`;
  iconPreview.style.fontSize = "24px";

  await this.loadAssociatedProducts(category.id);
  this.app.popup.open(".category-popup", true);
},

  async loadAssociatedProducts(categoryId) {
    try {
      const productsList = document.getElementById("associated-products");
      const noProductsMsg = document.getElementById("no-products-message");

      productsList.innerHTML = "";
      noProductsMsg.style.display = "none";
      const products = await getProductsByCategory(categoryId);

      if (products.length === 0) {
        noProductsMsg.style.display = "block";
        return;
      }

      products.forEach((product) => {
        const li = document.createElement("li");
        li.className = "item-content product-item";
        li.style.padding = "12px 16px";
        li.style.borderBottom = "1px solid #f0f0f0";
        li.innerHTML = `
        <div class="item-inner" style="padding: 0;">
          <div class="item-title-row" style="margin-bottom: 4px;">
            <div class="item-title" style="font-size: 14px; font-weight: 500;">${product.nombre}</div>
            <div class="item-after" style="color: #4caf50; font-weight: 500;">${product.precio_venta} $</div>
          </div>
          <div class="item-subtitle" style="font-size: 13px; color: #666;">
            <span style="margin-right: 12px;">Stock: ${product.stock}</span>
            <span style="background-color: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
              ${product.tipo_unidad}
            </span>
          </div>
        </div>
      `;
        productsList.appendChild(li);
      });
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  },

  async saveCategory() {
    const id = document.getElementById("category-id").value;
    const nombre = document.getElementById("category-name").value.trim();
    const descripcion = document
      .getElementById("category-description")
      .value.trim();
    const icono = document.getElementById("category-icon").value;

    if (!nombre) {
      this.app.dialog.alert("El nombre de la categoría es requerido");
      return;
    }

    try {
      const categoryData = { nombre, descripcion, icono };

      if (id) {
        // Actualizar categoría existente
        categoryData.id = parseInt(id);
        await this.app.store.dispatch("actualizarCategoria", categoryData);

        this.app.toast
          .create({
            text: "Categoría actualizada con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      } else {
        // Crear nueva categoría
        await this.app.store.dispatch("crearCategoria", categoryData);

        this.app.toast
          .create({
            text: "Categoría creada con éxito",
            position: "center",
            closeTimeout: 1500,
          })
          .open();
      }

      this.app.popup.close(".category-popup", true);
      await this.loadCategories();
    } catch (error) {
      this.app.dialog.alert("Error al guardar categoría: " + error.message);
    }
  },

  async deleteCategory() {
    if (!this.currentCategory) return;

    try {
      await this.app.dialog.confirm(
        "¿Estás seguro de eliminar esta categoría?",
        "Confirmar eliminación",
        async () => {
          await this.app.store.dispatch(
            "eliminarCategoria",
            this.currentCategory.id
          );

          this.app.toast
            .create({
              text: "Categoría eliminada con éxito",
              position: "center",
              closeTimeout: 1500,
            })
            .open();

          this.app.popup.close(".category-popup", true);
          await this.loadCategories();
        }
      );
    } catch (error) {
      this.app.dialog.alert("Error al eliminar categoría: " + error.message);
    }
  },

  showLoadingState(show) {
    const loadingEl = document.getElementById("loading-state-category");
    if (loadingEl) loadingEl.style.display = show ? "block" : "none";
  },

  showEmptyState(show) {
    const emptyEl = document.getElementById("empty-state-category");
    if (emptyEl) emptyEl.style.display = show ? "block" : "none";
  },

  showCategoriesList(show) {
    const listEl = document.getElementById("categories-list")?.parentElement;
    if (listEl) listEl.style.display = show ? "block" : "none";
  },
};

// Hacer disponible globalmente
window.CategoriesManager = CategoriesManager;
