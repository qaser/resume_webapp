import ApiService from './api.js';
import ProtocolsManager from './protocols.js';
import OrdersManager from './orders.js';
import PlanningManager from './planning.js';

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
            dataInputBtn: renderDataInputForm,
            dataViewBtn: renderDataViewForm,
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

    async function renderDataInputForm() {
        appContainer.innerHTML = await loadTemplate('data-input-form');

        const currentUserDepartment = localStorage.getItem("department");
        const isAdmin = currentUserDepartment === "Админ";

        // Для не-админов показываем информацию о текущей службе
        if (!isAdmin) {
            const currentServiceInfo = document.getElementById("currentServiceInfo");
            const currentServiceValue = document.getElementById("currentServiceValue");

            if (currentServiceInfo && currentServiceValue) {
                currentServiceInfo.style.display = "block";
                currentServiceValue.textContent = currentUserDepartment;
            }
        }

        initDataInputForm();
    }

    async function renderDataViewForm() {
        appContainer.innerHTML = await loadTemplate('data-view-form');

        const currentUserDepartment = localStorage.getItem("department");
        const isAdmin = currentUserDepartment === "Админ";
        const serviceButtonsContainer = document.querySelector('.service-buttons');
        const currentDepartmentInfo = document.getElementById('currentDepartmentInfo');
        const currentDepartmentName = document.getElementById('currentDepartmentName');

        if (isAdmin) {
            // Для админа скрываем блок с информацией о текущей службе
            if (currentDepartmentInfo) currentDepartmentInfo.style.display = 'none';

            // Оставляем кнопки выбора службы
            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    appContainer.dataset.currentDepartment = this.dataset.service;
                    await loadServiceData(this.dataset.service);
                });
            });

            // По умолчанию выбираем первую кнопку
            const firstBtn = document.querySelector('.service-btn');
            if (firstBtn) {
                firstBtn.classList.add('active');
                appContainer.dataset.currentDepartment = firstBtn.dataset.service;
                await loadServiceData(firstBtn.dataset.service);
            }
        } else {
            // Для обычных пользователей скрываем кнопки и показываем их службу
            if (serviceButtonsContainer) serviceButtonsContainer.style.display = 'none';
            if (currentDepartmentInfo) currentDepartmentInfo.style.display = 'block';
            if (currentDepartmentName) currentDepartmentName.textContent = currentUserDepartment;

            appContainer.dataset.currentDepartment = currentUserDepartment;
            await loadServiceData(currentUserDepartment);
        }
    }

    function initDataInputForm() {
        const reportForm = document.getElementById("reportForm");
        const dynamicFields = document.getElementById("dynamicFields");
        const typeButtons = document.querySelectorAll(".type-button");
        const serviceButtonsContainer = document.getElementById("serviceButtonsContainer");
        const serviceButtons = document.querySelectorAll("#serviceButtons .service-btn");

        const currentUserDepartment = localStorage.getItem("department");
        const isAdmin = currentUserDepartment === "Админ";

        let currentType = null;
        let currentService = isAdmin ? null : currentUserDepartment;

        // Скрываем выбор службы для не-админов
        if (!isAdmin) {
            serviceButtonsContainer.style.display = "none";
        }

        typeButtons.forEach(button => {
            button.addEventListener("click", async () => {
                typeButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                currentType = button.dataset.type;
                document.getElementById("typeError").style.display = "none";

                // Для админа показываем выбор службы, для остальных сразу показываем форму
                if (isAdmin) {
                    serviceButtonsContainer.style.display = "block";
                    reportForm.style.display = "none";
                    currentService = null;
                    serviceButtons.forEach(btn => btn.classList.remove("active"));
                } else {
                    try {
                        dynamicFields.innerHTML = await loadTemplate(currentType);
                        await loadAdditionalFields(currentType, currentService);
                        reportForm.style.display = "block";
                    } catch (error) {
                        console.error('Error loading form:', error);
                        dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
                    }
                }
            });
        });

        // Обработчик выбора службы (только для админа)
        if (isAdmin) {
            serviceButtons.forEach(button => {
                button.addEventListener("click", async () => {
                    serviceButtons.forEach(btn => btn.classList.remove("active"));
                    button.classList.add("active");
                    currentService = button.dataset.service;
                    document.getElementById("serviceError").style.display = "none";

                    try {
                        dynamicFields.innerHTML = await loadTemplate(currentType);
                        await loadAdditionalFields(currentType, currentService);
                        reportForm.style.display = "block";
                    } catch (error) {
                        console.error('Error loading form:', error);
                        dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
                    }
                });
            });
        }

        // Отправка формы
        reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                if (!currentType) {
                    throw new Error("Не выбран тип отчета");
                }
                if (!currentService) {
                    throw new Error("Не выбрана служба");
                }

                const formData = new FormData(reportForm);
                const data = {
                    service: currentService,
                    type: currentType,
                    csrfmiddlewaretoken: csrfToken
                };

                // Добавляем данные утечек для разрешенных служб
                const hideForServices = ['ВПО', 'Связь'];
                if (!hideForServices.includes(currentService) && currentType === 'weekly') {
                    data.leak_total = parseInt(formData.get('leak_total')) || 0;
                    data.leak_done = parseInt(formData.get('leak_done')) || 0;
                }

                // Для службы ЛЭС добавляем данные КСС
                if (currentService === 'ЛЭС' && currentType === 'weekly') {
                    const kssDone = formData.get('kss_done');
                    if (kssDone) {
                        data.kss_done = parseInt(kssDone);
                    }
                }

                // Собираем данные протоколов для weekly
                if (currentType === 'weekly') {
                    document.querySelectorAll('.protocol-action-btn').forEach(btn => {
                        const protocolId = btn.dataset.id;
                        data[`protocol_${protocolId}`] = btn.classList.contains('done') ? 'on' : 'off';
                    });
                }

                formData.forEach((value, key) => {
                    data[key] = value;
                });

                const result = await api.submitReport(data);

                if (result.status === 'success') {
                    showNotification('✓ Данные успешно сохранены', 'success');
                    reportForm.reset();

                    setTimeout(() => {
                        // Сбрасываем форму к начальному состоянию
                        typeButtons.forEach(btn => btn.classList.remove("active"));
                        if (isAdmin) {
                            serviceButtons.forEach(btn => btn.classList.remove("active"));
                            serviceButtonsContainer.style.display = "none";
                        }
                        reportForm.style.display = "none";
                        currentType = null;
                        currentService = isAdmin ? null : currentUserDepartment;
                    }, 1000);
                } else {
                    throw new Error(result.message || 'Ошибка сохранения данных');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showNotification(error.message || 'Ошибка при сохранении данных', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Вынесем загрузку дополнительных полей в отдельную функцию
        async function loadAdditionalFields(type, service) {
            if (type === 'weekly') {
                // Загружаем поле утечек отдельно
                const leaksHtml = await loadTemplate('leaks-field');
                dynamicFields.insertAdjacentHTML('beforeend', leaksHtml);

                // Показываем поле утечек для всех, кроме ВПО и Связь
                const leaksSection = document.querySelector('.form-group-leak');
                if (leaksSection) {
                    const hideForServices = ['ВПО', 'Связь'];
                    leaksSection.style.display = hideForServices.includes(service) ? 'none' : 'block';
                }

                // Загружаем поле КСС отдельно
                const kssHtml = await loadTemplate('kss-field');
                dynamicFields.insertAdjacentHTML('beforeend', kssHtml);

                // Показываем поле КСС только для ЛЭС
                const kssSection = document.querySelector('.form-group-kss');
                if (kssSection) {
                    kssSection.style.display = service === 'ЛЭС' ? 'block' : 'none';
                }

                // await loadProtocolsForReport(service);
            }

            // Инициализация обработчиков для полей ввода
            const allInputs = dynamicFields.querySelectorAll("input[type='number']");
            allInputs.forEach(input => {
                if (input.name.includes("undone")) {
                    input.addEventListener("input", () => {
                        const container = input.closest(".form-group-section");
                        const reasonField = container.querySelector(".reason-field");
                        if (!reasonField) return;

                        const val = parseInt(input.value.trim());
                        reasonField.style.display = val > 0 ? "block" : "none";
                    });
                }
            });
        }
    }

    async function loadServiceData(service) {
        const dataDisplay = document.getElementById("dataDisplay");
        dataDisplay.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const data = await api.getReports(service);

            if (data.status === 'success') {
                await renderServiceData(data.reports);
            } else {
                throw new Error(data.message || 'Неизвестная ошибка сервера');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            dataDisplay.innerHTML = `
                <div class="error">
                    Ошибка загрузки данных
                    <div class="error-detail">${error.message}</div>
                </div>
            `;
        }
    }

    async function renderServiceData(reports) {
        const dataDisplay = document.getElementById("dataDisplay");

        if (!reports || reports.length === 0) {
            dataDisplay.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
            return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const currentDepartment = appContainer.dataset.currentDepartment;

        if (!currentDepartment) {
            dataDisplay.innerHTML = '<div class="error">Не выбрана служба</div>';
            return;
        }

        try {
            const isLES = currentDepartment === 'ЛЭС';

            // Используем API методы для загрузки данных
            const [plansResponse, leaksResponse, remarksResponse, kssResponse] = await Promise.all([
                api.getPlans(currentDepartment, currentYear),
                api.getLeaks(currentDepartment, currentYear),
                api.getRemarks(currentDepartment, currentYear),
                isLES ? api.getKss(currentYear) : Promise.resolve(null)
            ]);

            // Обрабатываем ответы
            const plans = plansResponse.status === 'success' ? plansResponse.plans : null;
            const leaks = leaksResponse.status === 'success' ? leaksResponse.leaks : null;
            const remarks = remarksResponse.status === 'success' ? remarksResponse.remarks : null;
            const kssTotal = kssResponse && kssResponse.status === 'success' ? kssResponse.total : 0;

            const getRemarkData = (type) => {
                if (!remarks) return null;
                return remarks.find(r => r.value === type) || null;
            };

            const getPlanData = (type) => {
                if (!plans) return null;
                return plans.find(p => p.value === type) || null;
            };

            // Разделяем отчеты по типам
            const dailyReports = reports.filter(r => r.type === 'daily').sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            const weeklyReports = reports.filter(r => r.type === 'weekly').sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

            let html = '';

            // Функция для рендеринга отчета с навигацией
            const renderReportWithNavigation = (report, reportType, reportsList, index) => {
                const date = new Date(report.datetime).toLocaleString();
                const type = reportType === 'daily' ? 'Ежедневный отчёт' : 'Еженедельный отчёт';
                const data = report.data;

                return `
                    <div class="data-section" data-type="${reportType}" data-index="${index}">
                        <div class="data-header">
                            <button class="nav-arrow prev-arrow" ${index === reportsList.length - 1 ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>
                            <h3>${type} на ${date}</h3>
                            <button class="nav-arrow next-arrow" ${index === 0 ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>
                        </div>

                        ${renderDataGroup('Задания на день', data.tasks)}
                        ${renderDataGroup('Замечания по оборудованию', data.faults)}

                        ${data.apk ? renderCategory('АПК I уровень', data.apk) : ''}
                        ${data.apk2 ? renderCategory('АПК II уровень', data.apk2) : ''}

                        ${data.leak ? renderCategory('Утечки газа', data.leak, {
                            total: leaks?.total || 0,
                            done: leaks?.done || 0
                        }) : ''}

                        ${data.apk4 ? renderCategory('АПК IV уровень', data.apk4, {
                            total: getRemarkData('apk4')?.total || 0
                        }) : ''}

                        ${data.ozp ? renderCategory('Подготовка к ОЗП', data.ozp, {
                            total: getRemarkData('ozp')?.total || 0,
                            done: getRemarkData('ozp')?.done || 0
                        }) : ''}

                        ${data.gaz ? renderCategory('Замечания Газнадзора', data.gaz, {
                            total: getRemarkData('gaz')?.total || 0,
                            done: getRemarkData('gaz')?.done || 0
                        }) : ''}

                        ${data.ros ? renderCategory('Замечания Ростехнадзора', data.ros, {
                            total: getRemarkData('ros')?.total || 0,
                            done: getRemarkData('ros')?.done || 0
                        }) : ''}

                        ${data.rp ? renderCategory('Рационализаторские предложения', data.rp, {
                            total: getPlanData('rp')?.total || 0,
                            currentQuarter: getPlanData('rp')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${data.pat ? renderCategory('ПАТ', data.pat, {
                            total: getPlanData('pat')?.total || 0,
                            currentQuarter: getPlanData('pat')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${data.tu ? renderCategory('Техническая учёба', data.tu, {
                            total: getPlanData('tu')?.total || 0,
                            currentQuarter: getPlanData('tu')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${(data.kss && isLES) ? renderCategory('Кольцевые сварные соединения', data.kss, {
                            total: kssTotal
                        }) : ''}
                    </div>
                `;
            };

            // Рендерим последний ежедневный отчет
            if (dailyReports.length > 0) {
                html += renderReportWithNavigation(dailyReports[0], 'daily', dailyReports, 0);
            }

            // Рендерим последний еженедельный отчет
            if (weeklyReports.length > 0) {
                html += renderReportWithNavigation(weeklyReports[0], 'weekly', weeklyReports, 0);
            }

            dataDisplay.innerHTML = html;

            // Добавляем обработчики для кнопок навигации
            document.querySelectorAll('.nav-arrow').forEach(arrow => {
                arrow.addEventListener('click', function() {
                    const section = this.closest('.data-section');
                    const reportType = section.dataset.type;
                    const currentIndex = parseInt(section.dataset.index);
                    const reportsList = reportType === 'daily' ? dailyReports : weeklyReports;

                    let newIndex = currentIndex;
                    if (this.classList.contains('prev-arrow')) {
                        newIndex = currentIndex + 1; // Более старый отчет
                    } else if (this.classList.contains('next-arrow')) {
                        newIndex = currentIndex - 1; // Более новый отчет
                    }

                    if (newIndex >= 0 && newIndex < reportsList.length) {
                        const newReport = reportsList[newIndex];
                        const newHtml = renderReportWithNavigation(newReport, reportType, reportsList, newIndex);
                        section.outerHTML = newHtml;
                    }
                });
            });

        } catch (error) {
            console.error('Неожиданная ошибка:', error);
            dataDisplay.innerHTML = `
                <div class="error">
                    Ошибка загрузки данных. Пожалуйста, попробуйте позже.
                    ${error.message ? `<div class="error-detail">${error.message}</div>` : ''}
                </div>
            `;
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


    // Вспомогательные функции
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}-notification`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }


    function renderCategory(title, data, additionalData = {}) {
        let items = '';
        const categoryClass = getCategoryClass(title);

        if (additionalData.total !== undefined) {
            let label = '';

            if (['Рационализаторские предложения', 'ПАТ', 'Техническая учёба'].includes(title)) {
                label = 'План на текущий год';
            }
            else if (['Подготовка к ОЗП', 'Замечания Газнадзора', 'Замечания Ростехнадзора', 'АПК IV уровень'].includes(title)) {
                label = 'Всего замечаний';
            }
            else if (title === 'Кольцевые сварные соединения') {
                label = 'Всего КСС';
            }
            else {
                label = 'Всего за текущий год';
            }

            items += `
                <div class="data-item">
                    <span class="data-label">${label}:</span>
                    <span class="data-value">${additionalData.total || 0}</span>
                </div>
            `;
        }

        if (additionalData.currentQuarter !== undefined) {
            items += `
                <div class="data-item">
                    <span class="data-label">План на текущий квартал:</span>
                    <span class="data-value">${additionalData.currentQuarter || 0}</span>
                </div>
            `;
        }

        for (const [key, value] of Object.entries(data)) {
            if (!value && value !== 0) continue;

            if (key.includes('reason')) {
                if (!value) continue;

                items += `
                    <div class="data-item reason-item">
                        <span class="data-label">${getFieldLabel(key)}:</span>
                        <div class="data-value reason-text">${value}</div>
                    </div>
                `;
            } else {
                items += `
                    <div class="data-item">
                        <span class="data-label">${getFieldLabel(key)}:</span>
                        <span class="data-value">${value}</span>
                    </div>
                `;
            }
        }

        return `
            <div class="data-group">
                <div class="data-group-title ${categoryClass}">${title}</div>
                ${items}
            </div>
        `;
    }

    function renderDataGroup(title, value) {
        if (!value) return '';

        const categoryClass = getCategoryClass(title);

        return `
            <div class="data-group">
                <div class="data-group-title ${categoryClass}">${title}</div>
                <div class="data-item">
                    <div class="data-value">${value}</div>
                </div>
            </div>
        `;
    }

    function getCategoryClass(title) {
        const categoryMap = {
            'АПК I уровень': 'apk',
            'АПК II уровень': 'apk',
            'Утечки газа': 'leak',
            'Подготовка к ОЗП': 'ozp',
            'АПК IV уровень': 'apk',
            'Замечания Газнадзора': 'gaz',
            'Замечания Ростехнадзора': 'ros',
            'Рационализаторские предложения': 'rp',
            'ПАТ': 'pat',
            'Техническая учёба': 'tu',
            'Кольцевые сварные соединения': 'kss special',
            'Задания на день': 'tasks',
            'Замечания по оборудованию': 'faults'
        };

        return categoryMap[title] || '';
    }

    function getFieldLabel(fieldName) {
        const labels = {
            'tasks': 'Задания на день',
            'faults': 'Замечания по оборудованию',
            'apk_total': 'Всего замечаний',
            'apk_done': 'Устранено',
            'apk_undone': 'Не устранено',
            'apk_reason_undone': 'Причина неустранения',
            'apk2_total': 'Всего замечаний',
            'apk2_done': 'Устранено',
            'apk2_undone': 'Не устранено',
            'apk2_reason_undone': 'Причина неустранения',
            'leak_total': 'Обнаружено утечек',
            'leak_done': 'Устранено утечек',
            'apk4_done': 'Устранено',
            'apk4_undone': 'Не устранено',
            'apk4_reason_undone': 'Причина неустранения',
            'ozp_done': 'Устранено',
            'ozp_undone': 'Не устранено',
            'ozp_reason_undone': 'Причина неустранения',
            'gaz_done': 'Устранено',
            'gaz_undone': 'Не устранено',
            'gaz_reason_undone': 'Причина неустранения',
            'ros_done': 'Устранено',
            'ros_undone': 'Не устранено',
            'ros_reason_undone': 'Причина неустранения',
            'rp_done': 'Подано',
            'rp_inwork': 'В работе',
            'pat_done': 'Проведено',
            'tu_done': 'Проведено',
            'kss_done': 'Выполнено'
        };

        return labels[fieldName] || fieldName;
    }
});
