const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

// API service
const api = {
    // Отправка отчета
    async submitReport(data) {
        const response = await fetch('/api/reports/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    // Получение отчетов по службе
    async getReports(service) {
        const response = await fetch(`/api/reports/?service=${encodeURIComponent(service)}&all=true`);
        return await response.json();
    },

    // Получение планов
    async getPlans(department, year) {
        const response = await fetch(`/api/plans/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    },

    // Получение данных по утечкам
    async getLeaks(department, year) {
        const response = await fetch(`/api/leaks/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    },

    // Получение замечаний
    async getRemarks(department, year) {
        const response = await fetch(`/api/remarks/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    },

    // Получение данных по КСС (только для ЛЭС)
    async getKss(year) {
        const response = await fetch(`/api/kss/?year=${year}`);
        return await response.json();
    },

    // Сохранение плана
    async savePlan(data) {
        const response = await fetch('/api/planning/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async getProtocols() {
        const response = await fetch('/api/protocols/');
        return await response.json();
    },

    // Добавление протокола
    async addProtocol(data) {
        const response = await fetch('/api/protocols/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    // Архивирование протокола
    async archiveProtocol(id) {
        const response = await fetch(`/api/protocols/${id}/archive/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            }
        });
        return await response.json();
    },

    async updateProtocol(protocolId, service, doneDate) {
        const response = await fetch(`/api/protocols/${protocolId}/done/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ service, done_date: doneDate })
        });
        return await response.json();
    },

    async getOrders() {
        const response = await fetch('/api/orders/');
        return await response.json();
    },

    // Добавление распоряжений
    async addOrder(data) {
        const response = await fetch('/api/orders/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    // Архивирование распоряжения
    async archiveOrder(id) {
        const response = await fetch(`/api/orders/${id}/archive/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            }
        });
        return await response.json();
    },

    async updateOrder(orderId, service, doneDate) {
        const response = await fetch(`/api/orders/${orderId}/done/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ service, done_date: doneDate })
        });
        return await response.json();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById("app-container");
    const dataInputBtn = document.getElementById("dataInputBtn");
    const dataViewBtn = document.getElementById("dataViewBtn");
    const dataPlanBtn = document.getElementById("dataPlanBtn");
    const dataProtocolBtn = document.getElementById("dataProtocolBtn");
    const dataOuterRemarksBtn = document.getElementById("dataOuterRemarksBtn");
    const dataOrderlBtn = document.getElementById("dataOrderlBtn");

    // Инициализация приложения
    initApp();

    function initApp() {
        // Обработчики для кнопок меню (остается без изменений)
        dataInputBtn.addEventListener("click", () => {
            dataInputBtn.classList.add("active");
            dataViewBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            dataProtocolBtn.classList.remove("active");
            dataOuterRemarksBtn.classList.remove("active");
            dataOrderlBtn.classList.remove("active");
            renderDataInputForm();
        });

        dataViewBtn.addEventListener("click", () => {
            dataViewBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            dataProtocolBtn.classList.remove("active");
            dataOuterRemarksBtn.classList.remove("active");
            dataOrderlBtn.classList.remove("active");
            renderDataViewForm();
        });

        dataPlanBtn.addEventListener("click", () => {
            dataPlanBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataViewBtn.classList.remove("active");
            dataProtocolBtn.classList.remove("active");
            dataOuterRemarksBtn.classList.remove("active");
            dataOrderlBtn.classList.remove("active");
            renderPlanningForm();
        });

        dataProtocolBtn.addEventListener("click", () => {
            dataProtocolBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataViewBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            dataOuterRemarksBtn.classList.remove("active");
            dataOrderlBtn.classList.remove("active");
            renderProtocolForm();
        });

        dataOuterRemarksBtn.addEventListener("click", () => {
            dataOuterRemarksBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataViewBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            dataProtocolBtn.classList.remove("active");
            dataOrderlBtn.classList.remove("active");
            // renderOrderForm();
        });

        dataOrderlBtn.addEventListener("click", () => {
            dataOrderlBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataViewBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            dataProtocolBtn.classList.remove("active");
            dataOuterRemarksBtn.classList.remove("active");
            renderOrderForm();
        });

        // По умолчанию показываем форму ввода
        dataInputBtn.click();
    }

    async function loadTemplate(templateName, data = {}) {
        try {
            const response = await fetch(`${basePath}/${templateName}.html`);
            if (!response.ok) throw new Error('Template not found');

            let html = await response.text();

            // Простая замена переменных в шаблоне (опционально)
            for (const [key, value] of Object.entries(data)) {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            return html;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<div class="error">Ошибка загрузки шаблона: ${templateName}</div>`;
        }
    }

    // Функция для отображения формы ввода данных (остается без изменений)
    async function renderDataInputForm() {
        appContainer.innerHTML = await loadTemplate('data-input-form');
        initDataInputForm();
    }

    // Функция для отображения формы просмотра данных (остается без изменений)
    async function renderDataViewForm() {
        appContainer.innerHTML = await loadTemplate('data-view-form');

        // Добавляем обработчик для кнопок
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                appContainer.dataset.currentDepartment = this.dataset.service;
                await loadServiceData(this.dataset.service);
            });
        });
    }

    function initDataInputForm() {
        const reportForm = document.getElementById("reportForm");
        const dynamicFields = document.getElementById("dynamicFields");
        const typeButtons = document.querySelectorAll(".type-button");
        const serviceButtonsContainer = document.getElementById("serviceButtonsContainer");
        const serviceButtons = document.querySelectorAll("#serviceButtons .service-btn");

        let currentType = null;
        let currentService = null;

        typeButtons.forEach(button => {
            button.addEventListener("click", async () => {
                typeButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                currentType = button.dataset.type;
                document.getElementById("typeError").style.display = "none";

                // Показываем выбор службы
                serviceButtonsContainer.style.display = "block";
                reportForm.style.display = "none";
                currentService = null;

                // Сбрасываем выбор службы
                serviceButtons.forEach(btn => btn.classList.remove("active"));
            });
        });

        serviceButtons.forEach(button => {
            button.addEventListener("click", async () => {
                serviceButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                currentService = button.dataset.service;
                document.getElementById("serviceError").style.display = "none";

                try {
                    // Загружаем соответствующий шаблон
                    dynamicFields.innerHTML = await loadTemplate(currentType);

                    // Если это weekly - загружаем протоколы и дополнительные поля
                    if (currentType === 'weekly') {

                        // Загружаем поле утечек отдельно
                        const leaksHtml = await loadTemplate('leaks-field');
                        dynamicFields.insertAdjacentHTML('beforeend', leaksHtml);

                        // Показываем поле утечек для всех, кроме ВПО и Связь
                        const leaksSection = document.querySelector('.form-group-leak');
                        if (leaksSection) {
                            const hideForServices = ['ВПО', 'Связь'];
                            leaksSection.style.display = hideForServices.includes(currentService) ? 'none' : 'block';
                        }

                        // Загружаем поле КСС отдельно
                        const kssHtml = await loadTemplate('kss-field');
                        dynamicFields.insertAdjacentHTML('beforeend', kssHtml);

                        // Показываем поле КСС только для ЛЭС
                        const kssSection = document.querySelector('.form-group-kss');
                        if (kssSection) {
                            kssSection.style.display = currentService === 'ЛЭС' ? 'block' : 'none';
                        }

                        await loadProtocolsForReport(currentService);
                    }

                    reportForm.style.display = "block";

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
                } catch (error) {
                    console.error('Error loading form:', error);
                    dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
                }
            });
        });

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
                        serviceButtons.forEach(btn => btn.classList.remove("active"));
                        serviceButtonsContainer.style.display = "none";
                        reportForm.style.display = "none";
                        currentType = null;
                        currentService = null;
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
    }


    async function loadProtocolsForReport(service) {
        const container = document.getElementById('protocolsContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading">Загрузка мероприятий...</div>';

        try {
            const response = await api.getProtocols();
            if (response.status === 'success' && response.protocols.length > 0) {
                let html = '';

                response.protocols.forEach(protocol => {
                    if (!protocol.archived) {
                        const isChecked = protocol.done && protocol.done[service];

                        html += `
                            <div class="protocol-item">
                                <div class="protocol-info">
                                    <div class="protocol-date">${new Date(protocol.date).toLocaleDateString()}</div>
                                    <div class="protocol-text">${protocol.text}</div>
                                    <div class="protocol-completed">
                                        <div class="completed-label">${isChecked ? '✓ Выполнено вашей службой' : 'Не выполнено'}</div>
                                        ${protocol.done && Object.keys(protocol.done).length > 0 ? `
                                            <div class="completed-list">
                                                ${Object.entries(protocol.done)
                                                    .map(([dept, date]) =>
                                                        `<div class="completed-item">${dept} (${new Date(date).toLocaleDateString()})</div>`
                                                    ).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <button class="protocol-action-btn ${isChecked ? 'done' : ''}"
                                        data-id="${protocol._id}"
                                        type="button">
                                    ${isChecked ? '✓ Выполнено' : 'Отметить выполненным'}
                                </button>
                            </div>
                        `;
                    }
                });

                container.innerHTML = html || '<div class="no-data">Нет активных мероприятий</div>';

                // Обработчики для кнопок протоколов
                container.querySelectorAll('.protocol-action-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const isDone = this.classList.contains('done');
                        this.classList.toggle('done');
                        this.textContent = isDone ? 'Отметить выполненным' : '✓ Выполнено';

                        // Обновляем статус в блоке информации
                        const infoBlock = this.closest('.protocol-item').querySelector('.completed-label');
                        infoBlock.textContent = isDone ? 'Не выполнено' : '✓ Выполнено вашей службой';
                    });
                });
            } else {
                container.innerHTML = '<div class="no-data">Нет активных мероприятий</div>';
            }
        } catch (error) {
            console.error('Ошибка загрузки протоколов:', error);
            container.innerHTML = '<div class="error">Ошибка загрузки мероприятий</div>';
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>
                            <h3>${type} на ${date}</h3>
                            <button class="nav-arrow next-arrow" ${index === 0 ? 'disabled' : ''}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1, currentYear + 2];

        appContainer.innerHTML = await loadTemplate('planning-form', {
            yearOptions: years.map(year => `<option value="${year}">${year}</option>`).join('')
        });

        document.getElementById('planningForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                const formData = new FormData(this);
                const data = {
                    service: document.getElementById('planServiceSelect').value,
                    year: document.getElementById('planYearSelect').value,
                    csrfmiddlewaretoken: csrfToken
                };

                formData.forEach((value, key) => {
                    if (value) data[key] = value;
                });

                const result = await api.savePlan(data);

                if (result.status === 'success') {
                    showNotification('✓ Данные успешно сохранены', 'success');
                    setTimeout(() => {
                        dataInputBtn.click();
                        renderDataInputForm();
                    }, 500);
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
    }

    // Функция для рендеринга формы протоколов:
    async function renderProtocolForm() {
        appContainer.innerHTML = await loadTemplate('protocol-form');
        initProtocolForm();
    }

    // Функция для рендеринга формы распоряжений:
    async function renderOrderForm() {
        appContainer.innerHTML = await loadTemplate('order-form');
        initOrderForm();
    }

    // Инициализация формы протоколов
    function initProtocolForm() {
        const protocolForm = document.getElementById("protocolForm");
        const protocolsList = document.getElementById("protocolsList");

        // Загрузка списка протоколов
        loadProtocols();

        // Обработка отправки формы
        protocolForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                const formData = new FormData(protocolForm);
                const data = {
                    date: formData.get('date'),
                    text: formData.get('text'),
                    csrfmiddlewaretoken: csrfToken
                };

                const result = await api.addProtocol(data);

                if (result.status === 'success') {
                    showNotification('✓ Протокол успешно добавлен', 'success');
                    protocolForm.reset();
                    loadProtocols();
                } else {
                    throw new Error(result.message || 'Ошибка добавления протокола');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showNotification(error.message || 'Ошибка при добавлении протокола', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Функция загрузки протоколов
        async function loadProtocols() {
            protocolsList.innerHTML = '<div class="loading">Загрузка данных...</div>';

            try {
                const result = await api.getProtocols();

                if (result.status === 'success') {
                    if (result.protocols && result.protocols.length > 0) {
                        let html = '';
                        result.protocols.forEach(protocol => {
                            if (!protocol.archived) {
                                // Формируем список выполненных служб
                                let completedByHtml = '<div class="protocol-completed">Не выполнено</div>';
                                if (protocol.done && Object.keys(protocol.done).length > 0) {
                                    completedByHtml = `
                                        <div class="protocol-completed">
                                            <div class="completed-label">Выполнено:</div>
                                            <div class="completed-list">
                                                ${Object.entries(protocol.done)
                                                    .map(([dept, date]) => {
                                                        const formattedDate = new Date(date).toLocaleDateString();
                                                        return `<div class="completed-item">${dept} (${formattedDate})</div>`;
                                                    })
                                                    .join('')}
                                            </div>
                                        </div>
                                    `;
                                }

                                html += `
                                    <div class="protocol-item" data-id="${protocol._id}">
                                        <div class="protocol-info">
                                            <div class="protocol-date">${new Date(protocol.date).toLocaleDateString()}</div>
                                            <div class="protocol-text">${protocol.text}</div>
                                            ${completedByHtml}
                                        </div>
                                        <div class="protocol-actions">
                                            <button class="archive-btn" data-id="${protocol._id}">Архивировать</button>
                                        </div>
                                    </div>
                                `;
                            }
                        });

                        if (html === '') {
                            html = '<div class="no-data">Нет активных протоколов</div>';
                        }

                        protocolsList.innerHTML = '<h3>Список протоколов</h3>' + html;

                        // Обработчики кнопок архивирования остаются без изменений
                        document.querySelectorAll('.archive-btn').forEach(btn => {
                            btn.addEventListener('click', async function() {
                                const protocolId = this.dataset.id;
                                const protocolItem = this.closest('.protocol-item');

                                if (confirm('Вы уверены, что хотите архивировать этот протокол?')) {
                                    try {
                                        const result = await api.archiveProtocol(protocolId);

                                        if (result.status === 'success') {
                                            showNotification('✓ Протокол архивирован', 'success');
                                            protocolItem.remove();
                                        } else {
                                            throw new Error(result.message || 'Ошибка архивирования');
                                        }
                                    } catch (error) {
                                        console.error('Ошибка:', error);
                                        showNotification(error.message || 'Ошибка архивирования', 'error');
                                    }
                                }
                            });
                        });
                    } else {
                        protocolsList.innerHTML = '<h3>Список протоколов</h3><div class="no-data">Нет активных протоколов</div>';
                    }
                } else {
                    throw new Error(result.message || 'Ошибка загрузки протоколов');
                }
            } catch (error) {
                console.error('Ошибка загрузки протоколов:', error);
                protocolsList.innerHTML = `
                    <div class="error">
                        Ошибка загрузки протоколов
                        <div class="error-detail">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    // Инициализация формы распоряжений
    function initOrderForm() {
        const orderForm = document.getElementById("orderForm");
        const ordersList = document.getElementById("ordersList");

        // Загрузка списка распоряжений
        loadOrders();

        // Обработка отправки формы
        orderForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                const formData = new FormData(orderForm);
                const data = {
                    date: formData.get('date'),
                    num: formData.get('num'),
                    text: formData.get('text'),
                    csrfmiddlewaretoken: csrfToken
                };

                const result = await api.addOrder(data);

                if (result.status === 'success') {
                    showNotification('✓ Распоряжение успешно добавлено', 'success');
                    orderForm.reset();
                    loadOrders();
                } else {
                    throw new Error(result.message || 'Ошибка добавления распоряжения');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                showNotification(error.message || 'Ошибка при добавлении распоряжения', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Функция загрузки протоколов
        async function loadOrders() {
            ordersList.innerHTML = '<div class="loading">Загрузка данных...</div>';

            try {
                const result = await api.getOrders();

                if (result.status === 'success') {
                    if (result.orders && result.orders.length > 0) {
                        let html = '';
                        result.orders.forEach(order => {
                            if (!order.archived) {
                                // Формируем список выполненных служб
                                let completedByHtml = '<div class="order-completed">Не выполнено</div>';
                                if (order.done && Object.keys(order.done).length > 0) {
                                    completedByHtml = `
                                        <div class="order-completed">
                                            <div class="completed-label">Выполнено:</div>
                                            <div class="completed-list">
                                                ${Object.entries(order.done)
                                                    .map(([dept, date]) => {
                                                        const formattedDate = new Date(date).toLocaleDateString();
                                                        return `<div class="completed-item">${dept} (${formattedDate})</div>`;
                                                    })
                                                    .join('')}
                                            </div>
                                        </div>
                                    `;
                                }

                                html += `
                                    <div class="order-item" data-id="${order._id}">
                                        <div class="order-info">
                                            <div class="order-num">№${order.num}</div>
                                            <div class="order-date">${new Date(order.date).toLocaleDateString()}</div>
                                            <div class="order-text">${order.text}</div>
                                            ${completedByHtml}
                                        </div>
                                        <div class="order-actions">
                                            <button class="archive-btn" data-id="${order._id}">Архивировать</button>
                                        </div>
                                    </div>
                                `;
                            }
                        });

                        if (html === '') {
                            html = '<div class="no-data">Нет активных распоряжений</div>';
                        }

                        ordersList.innerHTML = '<h3>Список распоряжений (приказов)</h3>' + html;

                        document.querySelectorAll('.archive-btn').forEach(btn => {
                            btn.addEventListener('click', async function() {
                                const orderId = this.dataset.id;
                                const orderItem = this.closest('.order-item');

                                if (confirm('Вы уверены, что хотите архивировать это распоряжение?')) {
                                    try {
                                        const result = await api.archiveOrder(orderId);

                                        if (result.status === 'success') {
                                            showNotification('✓ Распоряжение архивировано', 'success');
                                            orderItem.remove();
                                        } else {
                                            throw new Error(result.message || 'Ошибка архивирования');
                                        }
                                    } catch (error) {
                                        console.error('Ошибка:', error);
                                        showNotification(error.message || 'Ошибка архивирования', 'error');
                                    }
                                }
                            });
                        });
                    } else {
                        ordersList.innerHTML = '<h3>Список распоряжений (приказов)</h3><div class="no-data">Нет активных распоряжений</div>';
                    }
                } else {
                    throw new Error(result.message || 'Ошибка загрузки распоряжений');
                }
            } catch (error) {
                console.error('Ошибка загрузки распоряжений:', error);
                ordersList.innerHTML = `
                    <div class="error">
                        Ошибка загрузки распоряжений
                        <div class="error-detail">${error.message}</div>
                    </div>
                `;
            }
        }
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
