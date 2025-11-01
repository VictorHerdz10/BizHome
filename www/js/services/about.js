// about.js
export const AboutPage = {
  init: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    // Card del logo
    const appCard = document.querySelector('.page[data-name="about"] .card:first-child');
    if (appCard) {
      appCard.addEventListener('click', this.toggleAppDescription.bind(this));
    }

    // Items de características
    const featureItems = document.querySelectorAll('.page[data-name="about"] .feature-item');
    featureItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Evitar que se propague al contenedor padre
        e.stopPropagation();
        this.toggleFeatureDescription(item);
      });
    });
  },

  toggleAppDescription: function() {
    const description = document.getElementById('app-description');
    const logo = document.getElementById('logo');
    
    if (description.style.display === 'none' || !description.style.display) {
      description.style.display = 'block';
      logo.style.transform = 'scale(1.1)';
    } else {
      description.style.display = 'none';
      logo.style.transform = 'scale(1)';
    }
  },

  toggleFeatureDescription: function(element) {
    const description = element.querySelector('.feature-description');
    const icon = element.querySelector('.toggle-abajo');
    
    if (description.style.display === 'none' || !description.style.display) {
      description.style.display = 'block';
      icon.style.transform = 'rotate(180deg)';
    } else {
      description.style.display = 'none';
      icon.style.transform = 'rotate(0deg)';
    }
  }
};

window.AboutPage = AboutPage;