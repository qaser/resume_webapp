import ApiService from './api.js';
import ProtocolsManager from './protocols.js';
import OrdersManager from './orders.js';
import PlanningManager from './planning.js';
import DataViewManager from './data-view.js';
import DataInputManager from './data-input.js';

const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

const api = new ApiService(csrfToken);
const protocolsManager = new ProtocolsManager(api, csrfToken);
const ordersManager = new OrdersManager(api, csrfToken);
const planningManager = new PlanningManager(api, csrfToken);

const AppState = {
    currentUser: {
        department: localStorage.getItem("department") || "",
        isAdmin: localStorage.getItem("department") === "Админ"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById("app-container");
    const dataInputBtn = document.getElementById("dataInputBtn");
    const currentDepartment = localStorage.getItem("department");
    const logoutBtn = document.getElementById("logoutBtn");
    const currentDepartmentEl = document.getElementById("currentDepartment");
    const dataViewManager = new DataViewManager(api, appContainer);
    const dataInputManager = new DataInputManager(api, appContainer, csrfToken);

    if (currentDepartment && logoutBtn && currentDepartmentEl) {
    currentDepartmentEl.textContent = currentDepartment;

    logoutBtn.addEventListener("click", () => {
        // Очищаем localStorage
        localStorage.removeItem("department");
        localStorage.removeItem("auth_token");

        // Перенаправляем на страницу входа
        window.location.href = "/login";
    });
    } else if (logoutBtn) {
        logoutBtn.style.display = "none";
    }

    // Инициализация приложения
    initApp();

    function initApp() {
        const menuButtons = {
            dataInputBtn: () => dataInputManager.render(),
            dataViewBtn: () => dataViewManager.render(),
            dataPlanBtn: renderPlanningForm,
            dataProtocolBtn: renderProtocolForm,
            dataOuterRemarksBtn: () => {},
            dataOrderlBtn: renderOrderForm,
        };

        const allButtons = Object.keys(menuButtons).map(id => document.getElementById(id));

        for (const [btnId, renderFn] of Object.entries(menuButtons)) {
            const button = document.getElementById(btnId);
            button.addEventListener("click", () => {
                allButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                renderFn();
            });
        }
        document.getElementById("dataInputBtn").click();
    }

    async function loadTemplate(templateName, data = {}) {
        try {
            const response = await fetch(`${basePath}/${templateName}.html`);
            if (!response.ok) throw new Error('Template not found');

            let html = await response.text();

            for (const [key, value] of Object.entries(data)) {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            return html;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<div class="error">Ошибка загрузки шаблона: ${templateName}</div>`;
        }
    }

    async function renderPlanningForm() {
        const { html, init } = await planningManager.renderPlanningForm(AppState.currentUser.isAdmin);
        appContainer.innerHTML = html;
        init();
    }

    async function renderProtocolForm() {
        const { html, init } = await protocolsManager.renderProtocolForm(AppState.currentUser.isAdmin);
        appContainer.innerHTML = html;
        init();
    }

    async function renderOrderForm() {
        const { html, init } = await ordersManager.renderOrderForm(AppState.currentUser.isAdmin);
        appContainer.innerHTML = html;
        init();
    }
});
