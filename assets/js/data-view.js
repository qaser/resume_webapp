export default class DataViewManager {
    constructor(apiService, appContainer) {
        this.api = apiService;
        this.appContainer = appContainer;
        this.currentReports = {
            daily: { reports: [], currentIndex: 0, total: 0, service: '' },
            weekly: { reports: [], currentIndex: 0, total: 0, service: '' }
        };
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
            if (currentDepartmentInfo) currentDepartmentInfo.style.display = 'none';

            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.appContainer.dataset.currentDepartment = btn.dataset.service;
                    await this.loadServiceData(btn.dataset.service);
                });
            });

            const firstBtn = document.querySelector('.service-btn');
            if (firstBtn) {
                firstBtn.classList.add('active');
                this.appContainer.dataset.currentDepartment = firstBtn.dataset.service;
                await this.loadServiceData(firstBtn.dataset.service);
            }
        } else {
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
            // Загружаем только последние отчеты каждого типа
            const [dailyResponse, weeklyResponse] = await Promise.all([
                this.api.getReports(service, 'daily', 1, 0),
                this.api.getReports(service, 'weekly', 1, 0)
            ]);

            // Инициализируем структуру данных
            this.currentReports.daily = {
                reports: dailyResponse.reports || [],
                currentIndex: 0,
                total: dailyResponse.total_count || 0,
                service: service
            };

            this.currentReports.weekly = {
                reports: weeklyResponse.reports || [],
                currentIndex: 0,
                total: weeklyResponse.total_count || 0,
                service: service
            };

            await this.renderServiceData();
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

    async renderServiceData() {
        const dataDisplay = document.getElementById("dataDisplay");
        const currentDepartment = this.appContainer.dataset.currentDepartment;

        if (!currentDepartment) {
            dataDisplay.innerHTML = '<div class="error">Не выбрана служба</div>';
            return;
        }

        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
            const isLES = currentDepartment === 'ЛЭС';

            // Загружаем дополнительные данные
            const [plansResponse, leaksResponse, remarksResponse, kssResponse] = await Promise.all([
                this.api.getPlans(currentDepartment, currentYear),
                this.api.getLeaks(currentDepartment, currentYear),
                this.api.getRemarks(currentDepartment, currentYear),
                isLES ? this.api.getKss(currentYear) : Promise.resolve({status: 'success', total: 0})
            ]);

            const plans = plansResponse.status === 'success' ? plansResponse.plans : null;
            const leaks = leaksResponse.status === 'success' ? leaksResponse : {total: 0, done: 0};
            const remarks = remarksResponse.status === 'success' ? remarksResponse.remarks : [];
            const kssTotal = kssResponse && kssResponse.status === 'success' ? kssResponse.total : 0;

            let html = '';

            // Рендерим ежедневный отчет если есть
            if (this.currentReports.daily.reports.length > 0) {
                html += this.renderReport(
                    this.currentReports.daily.reports[0],
                    'daily',
                    { plans, leaks, remarks, kssTotal, currentQuarter, currentDepartment }
                );
            } else {
                html += '<div class="no-data">Нет ежедневных отчетов</div>';
            }

            // Рендерим еженедельный отчет если есть
            if (this.currentReports.weekly.reports.length > 0) {
                html += this.renderReport(
                    this.currentReports.weekly.reports[0],
                    'weekly',
                    { plans, leaks, remarks, kssTotal, currentQuarter, currentDepartment }
                );
            } else {
                html += '<div class="no-data">Нет еженедельных отчетов</div>';
            }

            dataDisplay.innerHTML = html;

            // Добавляем обработчики для навигации
            this.addNavigationHandlers();

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

    renderReport(report, reportType, additionalData) {
        const dateObj = new Date(report.datetime);
        const date = dateObj.toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'});
        const type = reportType === 'daily' ? 'Ежедневный отчёт' : 'Еженедельный отчёт';
        const data = report.data || {};

        // Безопасное получение reportInfo
        const reportInfo = this.currentReports[reportType] || { currentIndex: 0, total: 0 };

        const getRemarkData = (type) => {
            if (!additionalData.remarks) return null;
            return additionalData.remarks.find(r => r.value === type) || null;
        };

        const getPlanData = (type) => {
            if (!additionalData.plans) return null;
            return additionalData.plans.find(p => p.value === type) || null;
        };

        return `
            <div class="data-section" data-type="${reportType}">
                <div class="data-header">
                    <button class="nav-arrow prev-arrow" data-type="${reportType}" data-direction="prev">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                             stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                    </button>
                    <h3>${type} на ${date}</h3>
                    <button class="nav-arrow next-arrow" data-type="${reportType}" data-direction="next">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                             stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                </div>

                ${data.tasks ? this.renderDataGroup('Задания на день', data.tasks) : ''}
                ${data.faults ? this.renderDataGroup('Замечания по оборудованию', data.faults) : ''}

                ${data.apk ? this.renderCategory('АПК I уровень', data.apk) : ''}
                ${data.apk2 ? this.renderCategory('АПК II уровень', data.apk2) : ''}

                ${data.leak ? this.renderCategory('Утечки газа', data.leak, {
                    total: additionalData.leaks?.total || 0,
                    done: additionalData.leaks?.done || 0
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
                    currentQuarter: getPlanData('rp')?.quarters?.[additionalData.currentQuarter] || 0
                }) : ''}

                ${data.pat ? this.renderCategory('ПАТ', data.pat, {
                    total: getPlanData('pat')?.total || 0,
                    currentQuarter: getPlanData('pat')?.quarters?.[additionalData.currentQuarter] || 0
                }) : ''}

                ${data.tu ? this.renderCategory('Техническая учёба', data.tu, {
                    total: getPlanData('tu')?.total || 0,
                    currentQuarter: getPlanData('tu')?.quarters?.[additionalData.currentQuarter] || 0
                }) : ''}

                ${(data.kss && additionalData.currentDepartment === 'ЛЭС') ? this.renderCategory('Кольцевые сварные соединения', data.kss, {
                    total: additionalData.kssTotal
                }) : ''}
            </div>
        `;
    }

    addNavigationHandlers() {
        document.querySelectorAll('.nav-arrow').forEach(arrow => {
            arrow.removeEventListener('click', this.navigationHandler);
            arrow.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Обновляем состояние кнопок
        this.updateNavigationButtons();
    }

    handleNavigation(event) {
        const reportType = event.currentTarget.dataset.type;
        const direction = event.currentTarget.dataset.direction;
        this.navigateReport(reportType, direction);
    }

    updateNavigationButtons() {
        Object.keys(this.currentReports).forEach(reportType => {
            const reportInfo = this.currentReports[reportType] || { currentIndex: 0, total: 0 };
            const prevButton = document.querySelector(`.nav-arrow.prev-arrow[data-type="${reportType}"]`);
            const nextButton = document.querySelector(`.nav-arrow.next-arrow[data-type="${reportType}"]`);

            if (prevButton) {
                prevButton.disabled = reportInfo.currentIndex >= reportInfo.total - 1;
            }
            if (nextButton) {
                nextButton.disabled = reportInfo.currentIndex <= 0;
            }
        });
    }

    async navigateReport(reportType, direction) {
        // Безопасное получение reportInfo
        const reportInfo = this.currentReports[reportType] || { currentIndex: 0, total: 0, service: '' };

        if (!reportInfo.service) {
            console.error('Service not defined for report type:', reportType);
            return;
        }

        let newIndex = reportInfo.currentIndex;
        let skip = 0;

        if (direction === 'next' && newIndex > 0) {
            newIndex--;
            skip = newIndex;
        } else if (direction === 'prev' && newIndex < reportInfo.total - 1) {
            newIndex++;
            skip = newIndex;
        } else {
            return; // Достигнуты границы
        }

        try {
            const dataDisplay = document.getElementById("dataDisplay");
            const loadingSection = dataDisplay.querySelector(`[data-type="${reportType}"]`);

            if (loadingSection) {
                loadingSection.innerHTML = '<div class="loading">Загрузка...</div>';
            }

            // Загружаем конкретный отчет
            const response = await this.api.getReports(
                reportInfo.service,
                reportType,
                1,
                skip
            );

            if (response.status === 'success') {
                // Обновляем данные
                this.currentReports[reportType].reports = response.reports || [];
                this.currentReports[reportType].currentIndex = skip;

                // Перерисовываем данные
                await this.renderServiceData();
            }
        } catch (error) {
            console.error('Ошибка навигации:', error);
            alert('Ошибка загрузки отчета: ' + error.message);

            // Восстанавливаем предыдущее состояние
            await this.renderServiceData();
        }
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

    renderCategory(title, data, additionalData = {}) {
        const categoryClass = this.getCategoryClass(title);
        let items = '';

        if (additionalData.total !== undefined) {
            let label = 'Всего за текущий год';

            if (['Рационализаторские предложения', 'ПАТ', 'Техническая учёба'].includes(title)) {
                label = 'План на текущий год';
            }
            else if (['Подготовка к ОЗП', 'Замечания Газнадзора', 'Замечания Ростехнадзора', 'АПК IV уровень'].includes(title)) {
                label = 'Всего замечаний';
            }
            else if (title === 'Кольцевые сварные соединения') {
                label = 'Всего КСС';
            }

            items += `
                <div class="data-item">
                    <span class="data-label">${label}:</span>
                    <span class="data-value">${additionalData.total || 0}</span>
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
