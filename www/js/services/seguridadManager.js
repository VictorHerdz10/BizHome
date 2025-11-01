import { SeguridadDB } from "../database/seguridad-db.js";
import { sha256 } from "../utils/hash-utils.js";

export const SeguridadManager = {
  app: null,
  currentMethod: null,
  lockoutInterval: null,
  remainingTime: 0,

  init(app) {
    this.app = app;
    this.bindEvents();
  },

  bindEvents() {
    document
      .getElementById("security-toggle")
      ?.addEventListener("change", () => this.toggleSecurity());

    document
      .getElementById("configure-pin-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareConfigureMethod("pin");
      });

    document
      .getElementById("configure-password-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.prepareConfigureMethod("password");
      });

    document
      .getElementById("save-security-btn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.saveSecurityConfig();
      });
  },

  async loadSecurityPage() {
    try {
      this.showLoadingState(true);
      const config = await SeguridadDB.getConfig();

      document.getElementById("security-toggle").checked = config.activado;
      document.getElementById("current-method").textContent =
        this.getMethodName(config.metodo);

      this.updateSecurityStatus(config);
    } catch (error) {
      console.error("Error loading security page:", error);
      this.app.dialog.alert("Error al cargar configuración de seguridad");
    } finally {
      this.showLoadingState(false);
    }
  },

  getMethodName(method) {
    switch (method) {
      case "pin":
        return "PIN numérico (4 dígitos)";
      case "password":
        return "Contraseña alfanumérica";
      default:
        return "No configurado";
    }
  },

  updateSecurityStatus(config) {
    const statusEl = document.getElementById("security-status");
    const statusTextEl = document.getElementById("security-status-text");
    const methodsContainer = document.getElementById("security-methods");

    if (config.activado) {
      statusEl.textContent = "Estado: Seguridad activada";
      statusEl.className = "block-header security-status-active";
      statusTextEl.textContent = "Activada";
      statusTextEl.style.color = "#4CAF50";
      methodsContainer.style.display = "block";

      const methodName = config.metodo
        ? this.getMethodName(config.metodo)
        : "No configurado";
      document.getElementById("current-method").textContent = methodName;
    } else {
      statusEl.textContent = "Estado: Seguridad desactivada";
      statusEl.className = "block-header security-status-inactive";
      statusTextEl.textContent = "Desactivada";
      statusTextEl.style.color = "#757575";
      methodsContainer.style.display = "block";
    }
  },

  async toggleSecurity() {
    const toggle = document.getElementById("security-toggle");
    const enabled = toggle.checked;

    try {
      this.app.preloader.show();
      const config = await SeguridadDB.getConfig();

      if (enabled && !config.metodo) {
        this.app.dialog.alert(
          "Debes configurar un método de seguridad primero"
        );
        toggle.checked = false;
        return;
      }

      config.activado = enabled;
      await SeguridadDB.updateConfig(config);

      this.updateSecurityStatus(config);
      this.showToast(`Seguridad ${enabled ? "activada" : "desactivada"}`);
    } catch (error) {
      console.error("Error toggling security:", error);
      toggle.checked = !enabled;
      this.app.dialog.alert("Error al cambiar estado de seguridad");
    } finally {
      this.app.preloader.hide();
    }
  },

  prepareConfigureMethod(method) {
    this.currentMethod = method;

    document.getElementById(
      "security-popup-title"
    ).textContent = `Configurar ${this.getMethodName(method)}`;

    document.getElementById("pin-fields").style.display = "none";
    document.getElementById("password-fields").style.display = "none";

    if (method === "pin") {
      document.getElementById("pin-fields").style.display = "block";
    } else if (method === "password") {
      document.getElementById("password-fields").style.display = "block";
    }

    document.getElementById("pin-input").value = "";
    document.getElementById("confirm-pin-input").value = "";
    document.getElementById("password-input").value = "";
    document.getElementById("confirm-password-input").value = "";

    this.app.popup.open("#security-config-popup");
  },

  async saveSecurityConfig() {
    try {
      this.app.preloader.show();
      const config = await SeguridadDB.getConfig();
      const method = this.currentMethod;

      let hashValue = "";

      if (method === "pin") {
        const pin = document.getElementById("pin-input").value;
        const confirmPin = document.getElementById("confirm-pin-input").value;

        if (!pin || pin.length !== 4) {
          throw new Error("El PIN debe tener exactamente 4 dígitos");
        }

        if (pin !== confirmPin) {
          throw new Error("Los PINs no coinciden");
        }

        hashValue = sha256(pin);
      } else if (method === "password") {
        const password = document.getElementById("password-input").value;
        const confirmPassword = document.getElementById(
          "confirm-password-input"
        ).value;

        if (!password || password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }

        if (password !== confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }

        hashValue = sha256(password);
      }
      config.metodo = method;
      config[`${method}_hash`] = hashValue;
      config.activado = true;

      await SeguridadDB.updateConfig(config);

      document.getElementById("current-method").textContent =
        this.getMethodName(method);
      document.getElementById("security-toggle").checked = true;
      this.updateSecurityStatus(config);

      this.showToast(`Método de seguridad configurado correctamente`);
      this.app.popup.close("#security-config-popup");
    } catch (error) {
      console.error("Error saving security config:", error);
      this.app.dialog.alert(error.message || "Error al guardar configuración");
    } finally {
      this.app.preloader.hide();
    }
  },

  showLoadingState(show) {
    const loadingEl = document.getElementById("security-loading");
    if (loadingEl) loadingEl.style.display = show ? "block" : "none";
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

  async verifyCredentials(method, input) {
    try {
      this.showUnlockLoading(true);
      const config = await SeguridadDB.getConfig();

      if (!config.activado) {
        this.showUnlockLoading(false);
        return true;
      }

      if (
        config.bloqueado_hasta &&
        new Date(config.bloqueado_hasta) > new Date()
      ) {
        this.startLockoutTimer(new Date(config.bloqueado_hasta));
        this.showUnlockLoading(false);
        throw new Error("Demasiados intentos fallidos. Intenta más tarde.");
      }

      let isValid = false;
      const inputHash = sha256(input);

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (method === "pin" && config.pin_hash) {
        isValid = inputHash === config.pin_hash;
      } else if (method === "password" && config.password_hash) {
        isValid = inputHash === config.password_hash;
      }

      if (isValid) {
        await SeguridadDB.resetFailedAttempts();
        this.stopLockoutTimer();
        return true;
      } else {
        await SeguridadDB.incrementFailedAttempts();

        if (config.intentos_fallidos + 1 >= 3) {
          await SeguridadDB.setLockoutTime(1);
          const lockoutTime = new Date(Date.now() + 60000);
          this.startLockoutTimer(lockoutTime);
          throw new Error(
            "Demasiados intentos fallidos. Tu cuenta estará bloqueada por 1 minuto."
          );
        }

        throw new Error(
          `${
            method === "pin"
              ? "PIN"
              : method === "password"
              ? "Contraseña"
              : "Patrón"
          } incorrecto`
        );
      }
    } catch (error) {
      throw error;
    } finally {
      this.showUnlockLoading(false);
    }
  },

  showUnlockMethod(method) {
    const container = document.getElementById("unlock-method-container");
    const instruction = document.getElementById("unlock-instruction");

    if (!container || !instruction) return;

    container.innerHTML = "";

    const baseButtonStyle = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
      height: 48px;
      border-radius: 24px;
      font-size: 16px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border: none;
      outline: none;
      cursor: pointer;
    `;

    const activeButtonStyle = `
      box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
      transform: translateY(-2px);
    `;

    const inputStyle = `
      width: 100%;
      padding: 12px 16px;
      font-size: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      outline: none;
      transition: all 0.3s ease;
      background-color: #f5f5f5;
    `;

    const focusInputStyle = `
      border-color: #2196F3;
      background-color: white;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    `;

    if (method === "pin") {
      instruction.textContent = "Ingresa tu PIN de 4 dígitos para continuar";

      container.innerHTML = `
        <div style="margin-bottom: 24px;">
          <div style="margin-bottom: 8px; font-size: 14px; color: #616161; font-weight: 500;">PIN de acceso</div>
          <input 
            type="password" 
            id="unlock-pin-input" 
            placeholder="••••" 
            maxlength="4" 
            inputmode="numeric" 
            pattern="[0-9]*"
            style="${inputStyle}"
          >
          <div style="margin-top: 4px; font-size: 12px; color: #757575;">Ingresa 4 dígitos</div>
        </div>
        <div>
          <button 
            id="unlock-btn" 
            style="${baseButtonStyle} background-color: #00bcd4; color: white;"
          >
            <span>Desbloquear</span>
            <i class="icon material-icons" style="margin-left: 8px; transition: all 0.3s ease;">lock_open</i>
          </button>
        </div>
      `;

      const input = document.getElementById("unlock-pin-input");
      const button = document.getElementById("unlock-btn");

      input.addEventListener("focus", () => {
        input.style = `${inputStyle} ${focusInputStyle}`;
      });

      input.addEventListener("blur", () => {
        input.style = inputStyle;
      });

      input.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");

        if (input.value.length === 4) {
          button.style = `${baseButtonStyle} ${activeButtonStyle} background-color: #2196F3; color: white;`;
          button.querySelector("i").style.transform = "rotate(10deg)";
        } else {
          button.style = `${baseButtonStyle} background-color: #2196F3; color: white;`;
          button.querySelector("i").style.transform = "rotate(0)";
        }
      });

      button.addEventListener("click", () => this.handleUnlock("pin"));
    } else if (method === "password") {
      instruction.textContent = "Ingresa tu contraseña para continuar";

      container.innerHTML = `
        <div style="margin-bottom: 24px;">
          <div style="margin-bottom: 8px; font-size: 14px; color: #616161; font-weight: 500;">Contraseña</div>
          <input 
            type="password" 
            id="unlock-password-input" 
            placeholder="Ingresa tu contraseña"
            style="${inputStyle}"
          >
          <div style="margin-top: 4px; font-size: 12px; color: #757575;">Ingresa tu contraseña personal</div>
        </div>
        <div>
          <button 
            id="unlock-btn" 
            style="${baseButtonStyle} background-color: #2196F3; color: white;"
          >
            <span>Desbloquear</span>
            <i class="icon material-icons" style="margin-left: 8px; transition: all 0.3s ease;">lock_open</i>
          </button>
        </div>
      `;

      const input = document.getElementById("unlock-password-input");
      const button = document.getElementById("unlock-btn");

      input.addEventListener("focus", () => {
        input.style = `${inputStyle} ${focusInputStyle}`;
      });

      input.addEventListener("blur", () => {
        input.style = inputStyle;
      });

      input.addEventListener("input", () => {
        if (input.value.length > 0) {
          button.style = `${baseButtonStyle} ${activeButtonStyle} background-color: #2196F3; color: white;`;
          button.querySelector("i").style.transform = "rotate(10deg)";
        } else {
          button.style = `${baseButtonStyle} background-color: #2196F3; color: white;`;
          button.querySelector("i").style.transform = "rotate(0)";
        }
      });

      button.addEventListener("click", () => this.handleUnlock("password"));
    }

    container.style.opacity = "0";
    container.style.transform = "translateY(10px) scale(0.98)";
    container.style.transition =
      "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

    setTimeout(() => {
      container.style.opacity = "1";
      container.style.transform = "translateY(0) scale(1)";
    }, 50);
  },

  async handleUnlock(method) {
    try {
      let input;

      if (method === "pin") {
        input = document.getElementById("unlock-pin-input").value;
        if (!input || input.length !== 4) {
          throw new Error("El PIN debe tener 4 dígitos");
        }
      } else if (method === "password") {
        input = document.getElementById("unlock-password-input").value;
        if (!input || input.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres");
        }
      }

      const isValid = await this.verifyCredentials(method, input);

      if (isValid) {
        const container = document.getElementById("unlock-method-container");
        if (container) {
          container.style.transform = "translateY(-20px)";
          container.style.opacity = "0";
          container.style.transition = "all 0.3s ease-out";
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        this.app.views.main.router.navigate("/", {
          clearPreviousHistory: true,
        });
      }
    } catch (error) {
      this.app.dialog.alert(error.message);

      const button = document.getElementById("unlock-btn");
      if (button) {
        button.style.transform = "translateX(-10px)";
        button.style.backgroundColor = "#F44336";

        setTimeout(() => {
          button.style.transform = "translateX(10px)";
        }, 50);

        setTimeout(() => {
          button.style.transform = "translateX(-10px)";
        }, 100);

        setTimeout(() => {
          button.style.transform = "translateX(0)";
          button.style.backgroundColor = "";
        }, 150);
      }
    }
  },

  startLockoutTimer(lockoutTime) {
    this.stopLockoutTimer();

    const timerElement = document.getElementById("lockout-timer");
    const countdownElement = document.getElementById("countdown");

    if (!timerElement || !countdownElement) return;

    timerElement.style.display = "block";

    this.lockoutInterval = setInterval(() => {
      const now = new Date();
      const diff = lockoutTime - now;

      if (diff <= 0) {
        this.stopLockoutTimer();
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      countdownElement.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      countdownElement.style.transform = "scale(1.1)";
      setTimeout(() => {
        countdownElement.style.transform = "scale(1)";
      }, 300);
    }, 1000);
  },

  stopLockoutTimer() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
      this.lockoutInterval = null;
    }

    const timerElement = document.getElementById("lockout-timer");
    if (timerElement) timerElement.style.display = "none";
  },

  showUnlockLoading(show) {
    const preloader = document.getElementById("unlock-preloader");
    const container = document.getElementById("unlock-method-container");
    const button = document.getElementById("unlock-btn");

    if (preloader) {
      preloader.style.display = show ? "block" : "none";
    }

    if (container) {
      container.style.opacity = show ? "0.5" : "1";
      container.style.pointerEvents = show ? "none" : "auto";
    }

    if (button) {
      button.disabled = show;
      button.innerHTML = show
        ? '<div class="preloader-button" style="width:20px;height:20px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>'
        : '<span>Desbloquear</span><i class="icon material-icons" style="margin-left:8px;">lock_open</i>';
    }
  },
};

window.seguridadManager = SeguridadManager;
