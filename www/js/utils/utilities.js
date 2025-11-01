// En un nuevo archivo utilities.js o en algún lugar accesible
export const CategoryUtils = {
  async loadCategories(app) {
    try {
      await app.store.dispatch("refreshCategories");
      return app.store.getters.categories.value;
    } catch (error) {
      console.error("Error loading categories:", error);
      throw error;
    }
  },
  
  async populateCategorySelect(selectElement, app) {
    try {
      const categories = await this.loadCategories(app);
      selectElement.innerHTML = '<option value="" disabled selected>Seleccione una categoría</option>';
      
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        selectElement.appendChild(option);
      });
      
      return categories;
    } catch (error) {
      console.error("Error populating category select:", error);
      throw error;
    }
  },
  
};
// En utilities.js
export const ColorPalette = {
  getCategoryColor(categoryId) {
    const palette = [
      '#5e35b1', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#2196f3', '#ffeb3b', '#795548',
      '#e91e63', '#3f51b5', '#009688', '#8bc34a', '#ff5722', '#607d8b', '#673ab7', '#cddc39',
      '#00acc1', '#7cb342', '#ffa000', '#5e35b1', '#d81b60', '#3949ab', '#00897b', '#43a047',
      '#fb8c00', '#8e24aa', '#c2185b', '#303f9f', '#00796b', '#689f38', '#f57c00', '#5e35b1',
      '#e53935', '#1e88e5', '#00acc1', '#7cb342', '#fdd835', '#fb8c00', '#8e24aa', '#3949ab',
      '#00897b', '#43a047', '#c0ca33', '#f4511e', '#5e35b1', '#d81b60', '#3949ab', '#00acc1',
      '#7cb342', '#fdd835', '#fb8c00', '#8e24aa', '#e53935', '#1e88e5', '#00acc1', '#7cb342',
      '#fdd835', '#fb8c00', '#8e24aa', '#5e35b1', '#d81b60', '#3949ab', '#00897b', '#43a047',
      '#c0ca33', '#f4511e', '#5e35b1', '#d81b60', '#3949ab', '#00acc1', '#7cb342', '#fdd835',
      '#fb8c00', '#8e24aa', '#e53935', '#1e88e5', '#00acc1', '#7cb342', '#fdd835', '#fb8c00',
      '#8e24aa', '#5e35b1', '#d81b60', '#3949ab', '#00897b', '#43a047', '#c0ca33', '#f4511e',
      '#5e35b1', '#d81b60', '#3949ab', '#00acc1', '#7cb342', '#fdd835', '#fb8c00', '#8e24aa'
    ];
    return palette[Math.abs(categoryId) % palette.length];
  }
};

// Hacer disponible globalmente si es necesario
window.CategoryUtils = CategoryUtils;