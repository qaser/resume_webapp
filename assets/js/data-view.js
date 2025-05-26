// data-view.js
export default class DataViewManager {
    constructor(apiService, appContainer) {
        this.api = apiService;
        this.appContainer = appContainer;
    }

    async render() {
        const html = await this.loadTemplate('data-view-form');
        this.appContainer.innerHTML = html;

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
                btn.addEventListener('click', async () => {
                    document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.appContainer.dataset.currentDepartment = btn.dataset.service;
                    await this.loadServiceData(btn.dataset.service);
                });
            });

            // По умолчанию выбираем первую кнопку
            const firstBtn = document.querySelector('.service-btn');
            if (firstBtn) {
                firstBtn.classList.add('active');
                this.appContainer.dataset.currentDepartment = firstBtn.dataset.service;
                await this.loadServiceData(firstBtn.dataset.service);
            }
        } else {
            // Для обычных пользователей скрываем кнопки и показываем их службу
            if (serviceButtonsContainer) serviceButtonsContainer.style.display = 'none';
            if (currentDepartmentInfo) currentDepartmentInfo.style.display = 'block';
            if (currentDepartmentName) currentDepartmentName.textContent = currentUserDepartment;

            this.appContainer.dataset.currentDepartment = currentUserDepartment;
            await this.loadServiceData(currentUserDepartment);
        }
    }

    async loadTemplate(templateName, data = {}) {
        try {
            const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

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

    async loadServiceData(service) {
        const dataDisplay = document.getElementById("dataDisplay");
        dataDisplay.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const data = await this.api.getReports(service);

            if (data.status === 'success') {
                await this.renderServiceData(data.reports);
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

    async renderServiceData(reports) {
        const dataDisplay = document.getElementById("dataDisplay");

        if (!reports || reports.length === 0) {
            dataDisplay.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
            return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const currentDepartment = this.appContainer.dataset.currentDepartment;

        if (!currentDepartment) {
            dataDisplay.innerHTML = '<div class="error">Не выбрана служба</div>';
            return;
        }

        try {
            const isLES = currentDepartment === 'ЛЭС';

            // Используем API методы для загрузки данных
            const [plansResponse, leaksResponse, remarksResponse, kssResponse] = await Promise.all([
                this.api.getPlans(currentDepartment, currentYear),
                this.api.getLeaks(currentDepartment, currentYear),
                this.api.getRemarks(currentDepartment, currentYear),
                isLES ? this.api.getKss(currentYear) : Promise.resolve(null)
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
                const dateObj = new Date(report.datetime);
                const date = dateObj.toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'});
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

                        ${this.renderDataGroup('Задания на день', data.tasks)}
                        ${this.renderDataGroup('Замечания по оборудованию', data.faults)}

                        ${data.apk ? this.renderCategory('АПК I уровень', data.apk) : ''}
                        ${data.apk2 ? this.renderCategory('АПК II уровень', data.apk2) : ''}

                        ${data.leak ? this.renderCategory('Утечки газа', data.leak, {
                            total: leaks?.total || 0,
                            done: leaks?.done || 0
                        }) : ''}

                        ${data.apk4 ? this.renderCategory('АПК IV уровень', data.apk4, {
                            total: getRemarkData('apk4')?.total || 0
                        }) : ''}

                        ${data.ozp ? this.renderCategory('Подготовка к ОЗП', data.ozp, {
                            total: getRemarkData('ozp')?.total || 0,
                            done: getRemarkData('ozp')?.done || 0
                        }) : ''}

                        ${data.gaz ? this.renderCategory('Замечания Газнадзора', data.gaz, {
                            total: getRemarkData('gaz')?.total || 0,
                            done: getRemarkData('gaz')?.done || 0
                        }) : ''}

                        ${data.ros ? this.renderCategory('Замечания Ростехнадзора', data.ros, {
                            total: getRemarkData('ros')?.total || 0,
                            done: getRemarkData('ros')?.done || 0
                        }) : ''}

                        ${data.rp ? this.renderCategory('Рационализаторские предложения', data.rp, {
                            total: getPlanData('rp')?.total || 0,
                            currentQuarter: getPlanData('rp')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${data.pat ? this.renderCategory('ПАТ', data.pat, {
                            total: getPlanData('pat')?.total || 0,
                            currentQuarter: getPlanData('pat')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${data.tu ? this.renderCategory('Техническая учёба', data.tu, {
                            total: getPlanData('tu')?.total || 0,
                            currentQuarter: getPlanData('tu')?.quarters?.[currentQuarter] || 0
                        }) : ''}

                        ${(data.kss && isLES) ? this.renderCategory('Кольцевые сварные соединения', data.kss, {
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

    renderCategory(title, data, additionalData = {}) {
        let items = '';
        const categoryClass = this.getCategoryClass(title);

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
                        <span class="data-label">${this.getFieldLabel(key)}:</span>
                        <div class="data-value reason-text">${value}</div>
                    </div>
                `;
            } else {
                items += `
                    <div class="data-item">
                        <span class="data-label">${this.getFieldLabel(key)}:</span>
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

    renderDataGroup(title, value) {
        if (!value) return '';

        const categoryClass = this.getCategoryClass(title);

        return `
            <div class="data-group">
                <div class="data-group-title ${categoryClass}">${title}</div>
                <div class="data-item">
                    <div class="data-value">${value}</div>
                </div>
            </div>
        `;
    }

    getCategoryClass(title) {
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

    getFieldLabel(fieldName) {
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
}
