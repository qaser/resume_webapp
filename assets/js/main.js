import ApiService from './api.js';
import ProtocolsManager from './protocols.js';
import OrdersManager from './orders.js';
import ReliabilityManager from './reliability.js';
import PlanningManager from './planning.js';
import DataViewManager from './data-view.js';
import DataInputManager from './data-input.js';
import FaultsManager from './faults.js';

const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

const api = new ApiService(csrfToken);
const protocolsManager = new ProtocolsManager(api, csrfToken);
const ordersManager = new OrdersManager(api, csrfToken);
const planningManager = new PlanningManager(api, csrfToken);
const faultsManager = new FaultsManager(api, csrfToken);
const reliabilityManager = new ReliabilityManager(api, csrfToken);

const AppState = {
    currentUser: {
        department: localStorage.getItem("department") || "",
        isAdmin: localStorage.getItem("department") === "Админ"
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById("app-container");
    const currentDepartment = localStorage.getItem("department");
    const logoutBtn = document.getElementById("logoutBtn");
    const currentDepartmentEl = document.getElementById("currentDepartment");
    const dataViewManager = new DataViewManager(api, appContainer);
    const dataInputManager = new DataInputManager(api, appContainer, csrfToken);

    if (currentDepartment && logoutBtn && currentDepartmentEl) {
        currentDepartmentEl.textContent = currentDepartment;
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("department");
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
        });
    } else if (logoutBtn) {
        logoutBtn.style.display = "none";
    }

    function initApp() {
        const menuButtons = {
            dataInputBtn: async () => {
                await dataInputManager.render();
            },
            dataViewBtn: async () => {
                await dataViewManager.render();
            },
            dataPlanBtn: async () => {
                const { html, init } = await planningManager.renderPlanningForm(AppState.currentUser.isAdmin);
                appContainer.innerHTML = html;
                init();
            },
            dataProtocolBtn: async () => {
                const { html, init } = await protocolsManager.renderProtocolForm(AppState.currentUser.isAdmin);
                appContainer.innerHTML = html;
                init();
            },
            dataFaultsBtn: async () => {
                const { html, init } = await faultsManager.renderFaultsForm(AppState.currentUser.isAdmin);
                appContainer.innerHTML = html;
                init();
            },
            dataOrderBtn: async () => {
                const { html, init } = await ordersManager.renderOrderForm(AppState.currentUser.isAdmin);
                appContainer.innerHTML = html;
                init();
            },
            dataReliabilityBtn: async () => {
                const { html, init } = await reliabilityManager.renderReliabilityForm(AppState.currentUser.isAdmin);
                appContainer.innerHTML = html;
                init();
            }
        };

        const allButtons = Object.keys(menuButtons).map(id => document.getElementById(id));

        for (const [btnId, renderFn] of Object.entries(menuButtons)) {
            const button = document.getElementById(btnId);
            button.addEventListener("click", async () => {
                allButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                try {
                    await renderFn();
                } catch (error) {
                    console.error('Error rendering:', error);
                    appContainer.innerHTML = `<div class="error">Ошибка загрузки раздела</div>`;
                }
            });
        }
        document.getElementById("dataInputBtn").click();
    }

    // Остальные функции остаются без изменений
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

    initApp();
});
