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
        const response = await fetch(`/api/reports/?service=${encodeURIComponent(service)}`);
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
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById("app-container");
    const dataInputBtn = document.getElementById("dataInputBtn");
    const dataViewBtn = document.getElementById("dataViewBtn");
    const dataPlanBtn = document.getElementById("dataPlanBtn");

    // Инициализация приложения
    initApp();

    function initApp() {
        // Обработчики для кнопок меню (остается без изменений)
        dataInputBtn.addEventListener("click", () => {
            dataInputBtn.classList.add("active");
            dataViewBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            renderDataInputForm();
        });

        dataViewBtn.addEventListener("click", () => {
            dataViewBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataPlanBtn.classList.remove("active");
            renderDataViewForm();
        });

        dataPlanBtn.addEventListener("click", () => {
            dataPlanBtn.classList.add("active");
            dataInputBtn.classList.remove("active");
            dataViewBtn.classList.remove("active");
            renderPlanningForm();
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

        typeButtons.forEach(button => {
            button.addEventListener("click", async () => {
                typeButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");

                const type = button.dataset.type;
                try {
                    dynamicFields.innerHTML = await loadTemplate(type);
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

        // Отправка формы (изменена для использования api.submitReport)
        reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                const formData = new FormData(reportForm);
                const data = {
                    service: document.getElementById("serviceSelect").value,
                    type: document.querySelector(".type-button.active").dataset.type,
                    csrfmiddlewaretoken: csrfToken
                };

                formData.forEach((value, key) => {
                    data[key] = value;
                });

                const result = await api.submitReport(data);

                if (result.status === 'success') {
                    showNotification('✓ Данные успешно сохранены', 'success');
                    reportForm.reset();

                    setTimeout(() => {
                        dataInputBtn.click();
                        renderDataInputForm();
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
    }

    async function loadServiceData(service) {
        const dataDisplay = document.getElementById("dataDisplay");
        dataDisplay.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            // Используем api.getReports вместо прямого fetch
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
            const remarks = remarksResponse.status === 'success' ? remarksResponse.remarks : null; // Обратите внимание на remarksResponse.remarks
            const kssTotal = kssResponse && kssResponse.status === 'success' ? kssResponse.total : 0;

            const getRemarkData = (type) => {
                if (!remarks) return null;
                return remarks.find(r => r.value === type) || null; // Ищем в массиве remarks
            };

            const getPlanData = (type) => {
                if (!plans) return null; // Теперь работаем напрямую с plans, а не plans.plans
                return plans.find(p => p.value === type) || null;
            };

            let html = '';

            reports.forEach(report => {
                const date = new Date(report.datetime).toLocaleString();
                const type = report.type === 'daily' ? 'Ежедневный отчёт' : 'Еженедельный отчёт';
                const data = report.data;

                html += `
                    <div class="data-section">
                        <div class="data-header">
                            <h3>${type} на ${date}</h3>
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
                            total: kssTotal  // Используем исправленное значение
                        }) : ''}
                    </div>
                `;
            });

            dataDisplay.innerHTML = html;
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
    }

    // Вспомогательные функции (остаются без изменений)
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
