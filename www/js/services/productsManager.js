import capacitorApp from "../capacitor-app.js";
import {
  addProduct,
  deleteProduct,
  updateProduct,
} from "../database/products.js";
import { CategoryUtils, ColorPalette } from "../utils/utilities.js";

export const ProductsManager = {
  app: null,
  currentProduct: null,

  init(app) {
    this.app = app;
    this.bindEvents();
  },
  bindEvents() {
    document
      .getElementById("add-product-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewProductForm();
      });
    // Botón flotante de agregar
    document
      .getElementById("add-product-fab")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareNewProductForm();
      });

    // Botón de guardar
    document
      .getElementById("save-product-btn")
      ?.addEventListener("click", () => this.saveProduct());

    // Botón de eliminar
    document
      .getElementById("delete-product-btn")
      ?.addEventListener("click", () => this.deleteProduct());

    // Selector de categoría
    document
      .getElementById("product-category")
      ?.addEventListener("change", (e) => {
        // Actualizar vista previa si es necesario
      });

    // Botón para seleccionar imagen
    document
      .getElementById("select-image-btn")
      ?.addEventListener("click", async () => {
        await this.selectImage();
      });
    document.getElementById("search-input")?.addEventListener("input", async(e) => {
      await this.filterProducts(e.target.value);
    });
    document.getElementById("info-button-product")?.addEventListener("click", (e) => {
    e.preventDefault();
    
    this.app.popup.open(".info-popup-product", {
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

  async selectImage() {
    try {
      const imageUri = await capacitorApp.selectImageFromGallery();
      const savedImage = await capacitorApp.saveImageToFilesystem(imageUri);

      document.getElementById("image-preview").src = savedImage;
      document.getElementById("image-path").value = savedImage;
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      this.app.dialog.alert("Error al seleccionar imagen: Has salido de la aplicación de imagenes");
    }
  },

  async loadProducts() {
    try {
      this.showLoadingState(true);

      await this.app.store.dispatch("refreshProducts");
      const products = this.app.store.getters.products.value;

      if (products.length === 0) {
        this.showEmptyState(true);
        this.showProductsList(false);
      } else {
        this.showEmptyState(false);
        await this.renderProducts(products);
        this.showProductsList(true);
      }
    } catch (error) {
      this.app.dialog.alert("Error al cargar productos: " + error.message);
      this.showLoadingState(false);
    } finally {
      this.showLoadingState(false);
    }
  },

 async filterProducts(searchTerm) {
  try {
    const allProducts = this.app.store.getters.products.value;
    const searchInput = document.getElementById("search-input");
    
    if (!searchTerm || searchTerm.trim() === "") {
      await this.renderProducts(allProducts, false);
      if (searchInput) searchInput.value = "";
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = allProducts.filter((product) => {
      return (
        (product.nombre && product.nombre.toLowerCase().includes(term)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(term)) ||
        (product.codigo_barras && product.codigo_barras.toLowerCase().includes(term))
      );
    });

    await this.renderProducts(filtered, true);
  } catch (error) {
    console.error("Error filtering products:", error);
    this.app.dialog.alert("Error al filtrar productos: " + error.message);
    this.showLoadingState(false);
  }
},

async renderProducts(products, isSearchResult = false) {
  try {
    const listEl = document.getElementById("products-list");
    const emptyStateEl = document.getElementById("empty-state-products");
    
    if (!listEl || !emptyStateEl) throw new Error("Elementos del DOM no encontrados");

    this.showLoadingState(true);
    listEl.innerHTML = "";

    if (!products || products.length === 0) {
      if (isSearchResult) {
        // Estado para búsqueda sin resultados
        emptyStateEl.innerHTML = `
          <i class="icon material-icons" style="font-size: 48px; color: #ccc;">search_off</i>
          <p>No se encontraron productos que coincidan con tu búsqueda</p>
          <a href="#" class="button button-fill button-round" id="clear-search-btn"
            style="background-color: #00bcd4; color: white;">
            <i class="icon material-icons">clear</i> Mostrar todos
          </a>
        `;
        
        // Evento para limpiar búsqueda
        document.getElementById("clear-search-btn")?.addEventListener("click", (e) => {
          e.preventDefault();
          this.filterProducts("");
        });
      } else {
        // Estado normal sin productos
        emptyStateEl.innerHTML = `
          <i class="icon material-icons" style="font-size: 48px; color: #ccc;">inventory_2</i>
          <p>No hay productos disponibles</p>
          <a href="#" class="button button-fill button-round" id="add-product-btn"
            style="background-color: #00bcd4; color: white;">
            <i class="icon material-icons">add</i> Agregar producto
          </a>
        `;
      }
      
      this.showEmptyState(true);
      this.showProductsList(false);
      return;
    }

    // Creamos un select temporal para categorías
    const categorySelect = document.createElement("select");
    let categoriesLoaded = false;

    try {
      await CategoryUtils.populateCategorySelect(categorySelect, this.app);
      categoriesLoaded = true;
    } catch (error) {
      console.warn("Error cargando categorías:", error);
    }

    const fragment = document.createDocumentFragment();
    const renderPromises = products.map(async (product) => {
      try {
        let categoryName = "Sin categoría";
        let categoryColor = "#9e9e9e";

        if (categoriesLoaded) {
          const categoryOption = categorySelect.querySelector(
            `option[value="${product.categoria_id}"]`
          );
          categoryName = categoryOption?.textContent || categoryName;
          categoryColor = ColorPalette.getCategoryColor(product.categoria_id);
        }

        const stockColor = this.getStockColor(product.stock);
        const stockIcon = product.stock <= 5 ? "warning" : "check_circle";

        const li = document.createElement("li");
        li.className = "product-item";
        li.style.cssText = `
          margin-bottom: 12px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
          background: linear-gradient(to right, ${categoryColor}20, white);
          border-left: 4px solid ${categoryColor};
          transition: all 0.3s ease;
        `;

        li.innerHTML = `
          <a href="#" class="item-link item-content" data-id="${product.id}" style="padding: 12px; align-items: center;">
            <div class="item-media" style="min-width: 70px; margin-right: 12px; position: relative;">
              <img src="${product.imagen_path || "../assets/images/no-image-icon.png"}" 
                   style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid #eee;">
              <div style="position: absolute; bottom: -5px; right: -5px; background: ${categoryColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${product.stock}
              </div>
            </div>
            
            <div class="item-inner" style="padding-right: 8px;">
              <div class="item-title-row" style="margin-bottom: 6px;">
                <div class="item-title" style="color: #2c3e50; font-weight: 600; font-size: 1rem;">${product.nombre}</div>
                <div class="item-after" style="color: #00bcd4; font-weight: bold; font-size: 1rem;">$${product.precio_venta.toFixed(2)}</div>
              </div>
              
              ${product.descripcion ? `
                <div class="product-description" style="color: #7f8c8d; font-size: 0.75rem; line-height: 1.4; margin: 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                  ${product.descripcion}
                </div>
              ` : ''}
              
              <div style="display: flex; align-items: center; margin-top: 8px;">
                <span style="background: ${categoryColor}20; color: ${categoryColor}; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; display: flex; align-items: center;">
                  <i class="icon material-icons" style="font-size: 0.7rem; margin-right: 4px;">category</i>
                  ${categoryName}
                </span>
                
                <span style="margin-left: auto; color: ${stockColor}; font-size: 0.7rem; display: flex; align-items: center;">
                  <i class="icon material-icons" style="font-size: 0.7rem; margin-right: 4px;">${stockIcon}</i>
                  ${product.tipo_unidad}
                </span>
              </div>
            </div>
          </a>
        `;

        // Evento para editar producto
        const link = li.querySelector("a");
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.prepareEditProductForm(product);
        });

        return li;
      } catch (error) {
        console.error("Error rendering product:", product.id, error);
        return null;
      }
    });

    // Procesar todos los productos
    const productElements = (await Promise.all(renderPromises)).filter(Boolean);
    productElements.forEach((li) => fragment.appendChild(li));

    listEl.appendChild(fragment);
    this.showEmptyState(false);
    this.showProductsList(true);
  } catch (error) {
    console.error("Error rendering products:", error);
    this.app.dialog.alert("Error al mostrar productos: " + error.message);
    this.showEmptyState(true);
  } finally {
    this.showLoadingState(false);
  }
},
  // Método para colores de stock
  getStockColor(stock) {
    if (stock <= 0) return "#e74c3c"; // Rojo (sin stock)
    if (stock <= 5) return "#f39c12"; // Naranja (stock bajo)
    return "#2ecc71"; // Verde (stock suficiente)
  },

  async prepareNewProductForm() {
    try {
      this.currentProduct = null;

      // Resetear todos los campos del formulario
      document.getElementById("popup-title-product").textContent = "Nuevo Producto";
      document.getElementById("delete-btn-container-products").style.display = "none";
      document.getElementById("product-id").value = "";
      document.getElementById("product-name").value = "";
      document.getElementById("product-description").value = "";
      document.getElementById("product-purchase-price").value = "";
      document.getElementById("product-sale-price").value = "";
      document.getElementById("product-stock").value = "";
      document.getElementById("product-unit-type").value = "unidad";
      document.getElementById("image-preview").src =
        "../assets/images/no-image-icon.png";
      document.getElementById("image-path").value = "";
      document.getElementById("barcode").value = "";

      // Cargar categorías (operación asíncrona)
      const categorySelect = document.getElementById("product-category");
      await CategoryUtils.populateCategorySelect(categorySelect, this.app);

      // Abrir popup
      await this.app.popup.open(".product-popup", true);
    } catch (error) {
      console.error("Error al preparar formulario nuevo:", error);
      this.app.dialog.alert(
        "Error al cargar el formulario: " +
          (error.message || "Error desconocido")
      );
    }
  },

  async prepareEditProductForm(product) {
    try {
      this.currentProduct = product;

      // Configurar campos del formulario
      document.getElementById("popup-title-product").textContent = "Editar Producto";
      document.getElementById("delete-btn-container-products").style.display = "block";
      document.getElementById("product-id").value = product.id;
      document.getElementById("product-name").value = product.nombre;
      document.getElementById("product-description").value =
        product.descripcion || "";
      document.getElementById("product-purchase-price").value =
        product.precio_compra;
      document.getElementById("product-sale-price").value =
        product.precio_venta;
      document.getElementById("product-stock").value = product.stock;
      document.getElementById("product-unit-type").value = product.tipo_unidad;
      document.getElementById("image-preview").src =
        product.imagen_path || "../assets/images/no-image-icon.png";
      document.getElementById("image-path").value = product.imagen_path || "";
      document.getElementById("barcode").value = product.codigo_barras || "";

      // Cargar categorías y seleccionar la correcta (operación asíncrona)
      const categorySelect = document.getElementById("product-category");
      await CategoryUtils.populateCategorySelect(categorySelect, this.app);
      categorySelect.value = product.categoria_id;

      // Abrir popup
      await this.app.popup.open(".product-popup", true);
    } catch (error) {
      console.error("Error al preparar formulario de edición:", {
        error: error.message,
        product: product,
      });
      this.app.dialog.alert(
        "Error al cargar el producto para editar: " +
          (error.message || "Error desconocido")
      );
    }
  },
async saveProduct() {
    try {
      const id = document.getElementById("product-id").value;
      const nombre = document.getElementById("product-name").value.trim();
      const descripcion = document
        .getElementById("product-description")
        .value.trim();
      const precio_compra = parseFloat(
        document.getElementById("product-purchase-price").value
      );
      const precio_venta = parseFloat(
        document.getElementById("product-sale-price").value
      );
      const stock = parseFloat(document.getElementById("product-stock").value);
      const tipo_unidad = document.getElementById("product-unit-type").value;
      const categoria_id = document.getElementById("product-category").value;
      const imagen_path = document.getElementById("image-path").value;
      const codigo_barras = document.getElementById("barcode").value.trim();

      // Validaciones básicas
      if (!nombre || nombre.length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres");
      }
      
      // Validaciones numéricas
      if (isNaN(precio_compra) || isNaN(precio_venta) || isNaN(stock)) {
        throw new Error("Los valores numéricos deben ser válidos");
      }
      
      if (precio_compra < 0) {
        throw new Error("El precio de compra no puede ser negativo");
      }
      
      if (precio_venta < 0) {
        throw new Error("El precio de venta no puede ser negativo");
      }
      
      if (stock < 0) {
        throw new Error("El stock no puede ser negativo");
      }
      
      // Validación relación precios
      if (precio_compra >= precio_venta) {
        throw new Error("El precio de venta debe ser mayor que el precio de compra para tener ganancias");
      }
      
      // Validación margen mínimo (opcional, puedes ajustar el 5% según necesites)
      const margen = ((precio_venta - precio_compra) / precio_compra) * 100;
      if (margen < 5) { // 5% de margen mínimo
        throw new Error("El margen de ganancia es muy bajo (mínimo 5%)");
      }
      
      // Validación unidad y categoría
      if (!tipo_unidad) {
        throw new Error("Seleccione un tipo de unidad");
      }
      if (!categoria_id) {
        throw new Error("Seleccione una categoría");
      }

      const productData = {
        nombre,
        descripcion,
        precio_compra,
        precio_venta,
        stock: stock || 0,
        tipo_unidad,
        categoria_id,
        imagen_path,
        codigo_barras,
      };

      if (id) {
        await updateProduct(parseInt(id), productData);
        await this.app.store.dispatch("refreshProducts");
        this.showToast("Producto actualizado con éxito");
      } else {
        await addProduct(productData);
        await this.app.store.dispatch("refreshProducts");
        this.showToast("Producto creado con éxito");
      }
      await this.loadProducts();
      this.app.popup.close(".product-popup", true);
    } catch (error) {
      console.error("Error en saveProduct:", error);
      this.app.dialog.alert(error.message || "Error al guardar producto");
    }
  },

  showToast(message) {
    this.app.toast
      .create({
        text: message,
        position: "center",
        closeTimeout: 1500,
      })
      .open();
  },

  async deleteProduct() {
    if (!this.currentProduct) return;

    try {
      await this.app.dialog.confirm(
        "¿Estás seguro de eliminar este producto?",
        "Confirmar eliminación",
        async () => {
          await deleteProduct(this.currentProduct.id);
          await this.app.store.dispatch("refreshProducts"); // Recargar todos
          this.showToast("Producto eliminado con éxito");
          this.app.popup.close(".product-popup", true);
        }
      );
      await this.loadProducts();
    } catch (error) {
      this.app.dialog.alert("Error al eliminar producto: " + error.message);
    }
  },
  showLoadingState(show) {
    const loadingEl = document.getElementById("loading-state-products");
    if (loadingEl) loadingEl.style.display = show ? "block" : "none";
  },

  showEmptyState(show) {
    const emptyEl = document.getElementById("empty-state-products");
    if (emptyEl) emptyEl.style.display = show ? "block" : "none";
  },

  showProductsList(show) {
    const containerEl = document.getElementById("products-container");
    if (containerEl) containerEl.style.display = show ? "block" : "none";
  },
};

// Hacer disponible globalmente
window.productManager = ProductsManager;
