const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

document.addEventListener('DOMContentLoaded', function() {
    const appContainer = document.getElementById("app-container");
    const dataInputBtn = document.getElementById("dataInputBtn");
    const dataViewBtn = document.getElementById("dataViewBtn");
    const dataPlanBtn = document.getElementById("dataPlanBtn");

    // Инициализация приложения
    initApp();

    function initApp() {
        // Обработчики для кнопок меню
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

    // Функция для отображения формы ввода данных
    function renderDataInputForm() {
        appContainer.innerHTML = `
            <div class="form-container">
                <h2>Ввод данных</h2>
                <div class="form-group">
                    <label for="serviceSelect">Служба</label>
                    <select id="serviceSelect" required>
                        <option value="">-- Выберите --</option>
                        <option value="КС-1,4">КС-1,4</option>
                        <option value="КС-2,3">КС-2,3</option>
                        <option value="КС-5,6">КС-5,6</option>
                        <option value="КС-7,8">КС-7,8</option>
                        <option value="КС-9,10">КС-9,10</option>
                        <option value="АиМО">АиМО</option>
                        <option value="ЭВС">ЭВС</option>
                        <option value="ЛЭС">ЛЭС</option>
                        <option value="СЗК">СЗК</option>
                        <option value="Связь">Связь</option>
                        <option value="ВПО">ВПО</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Тип отчета</label>
                    <div class="button-group">
                        <button type="button" class="type-button" data-type="daily">Ежедневный</button>
                        <button type="button" class="type-button" data-type="weekly">Еженедельный</button>
                    </div>
                </div>

                <form id="reportForm" style="display:none;">
                    <div id="dynamicFields"></div>
                    <button type="submit" class="submit-button">Отправить</button>
                </form>
            </div>
        `;

        initDataInputForm();
    }

    // Функция для отображения формы просмотра данных
    function renderDataViewForm() {
        appContainer.innerHTML = `
            <div class="view-container">
                <h2>Просмотр данных</h2>
                <div class="service-buttons" id="serviceButtons">
                    <button class="service-btn" data-service="КС-1,4">КС-1,4</button>
                    <button class="service-btn" data-service="КС-2,3">КС-2,3</button>
                    <button class="service-btn" data-service="КС-5,6">КС-5,6</button>
                    <button class="service-btn" data-service="КС-7,8">КС-7,8</button>
                    <button class="service-btn" data-service="КС-9,10">КС-9,10</button>
                    <button class="service-btn" data-service="АиМО">АиМО</button>
                    <button class="service-btn" data-service="ЭВС">ЭВС</button>
                    <button class="service-btn" data-service="ЛЭС">ЛЭС</button>
                    <button class="service-btn" data-service="СЗК">СЗК</button>
                    <button class="service-btn" data-service="Связь">Связь</button>
                    <button class="service-btn" data-service="ВПО">ВПО</button>
                </div>
                <div id="dataDisplay"></div>
            </div>
        `;

        // Добавляем обработчик для кнопок
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                // Устанавливаем активную кнопку
                document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Сохраняем выбранную службу в data-атрибут контейнера
                appContainer.dataset.currentDepartment = this.dataset.service;

                await loadServiceData(this.dataset.service);
            });
        });
    }

    // Инициализация формы ввода данных
    function initDataInputForm() {
        const reportForm = document.getElementById("reportForm");
        const dynamicFields = document.getElementById("dynamicFields");
        const typeButtons = document.querySelectorAll(".type-button");

        typeButtons.forEach(button => {
            button.addEventListener("click", () => {
                typeButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");

                const type = button.dataset.type;
                renderFields(type);
                reportForm.style.display = "block";
            });
        });

        async function renderFields(type) {
            try {
                const response = await fetch(`${basePath}${type}.html`);
                if (!response.ok) throw new Error('Network response was not ok');

                dynamicFields.innerHTML = await response.text();

                // Логика отображения reason-полей
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
                console.error('Error loading HTML:', error);
                dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
            }
        }

        // Отправка формы
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

                // Собираем все данные формы
                formData.forEach((value, key) => {
                    data[key] = value;
                });

                const response = await fetch('/api/reports/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken,
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Показываем уведомление в интерфейсе
                    showNotification('✓ Данные успешно сохранены', 'success');

                    // Сбрасываем форму
                    reportForm.reset();

                    // Возвращаем на начальный экран через 1 секунду
                    setTimeout(() => {
                        dataInputBtn.click();
                        renderDataInputForm();
                    }, 1000);
                } else {
                    throw new Error(result.message || 'Ошибка сохранения данных');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                // Показываем ошибку в интерфейсе
                showNotification(error.message || 'Ошибка при сохранении данных', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });

        // Функция для показа уведомлений
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}-notification`;
            notification.innerHTML = message;
            document.body.appendChild(notification);

            // Убираем уведомление через 3 секунды
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
            const response = await fetch(`/api/reports/?service=${encodeURIComponent(service)}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

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

            // Создаем объект для хранения всех данных
            const allData = {
                plans: { status: 'error', data: null },
                leaks: { status: 'error', data: null },
                remarks: { status: 'error', data: null },
                kss: { status: 'success', data: { total: 0 } } // Значение по умолчанию для KSS
            };

            // Загружаем основные данные с обработкой ошибок для каждого запроса
            try {
                const plansResponse = await fetch(`/api/plans/?department=${encodeURIComponent(currentDepartment)}&year=${currentYear}`);
                allData.plans = await plansResponse.json();
            } catch (e) {
                console.error('Ошибка загрузки планов:', e);
            }

            try {
                const leaksResponse = await fetch(`/api/leaks/?department=${encodeURIComponent(currentDepartment)}&year=${currentYear}`);
                allData.leaks = await leaksResponse.json();
            } catch (e) {
                console.error('Ошибка загрузки утечек:', e);
            }

            try {
                const remarksResponse = await fetch(`/api/remarks/?department=${encodeURIComponent(currentDepartment)}&year=${currentYear}`);
                allData.remarks = await remarksResponse.json();
            } catch (e) {
                console.error('Ошибка загрузки замечаний:', e);
            }

            // Загружаем KSS только для ЛЭС
            if (isLES) {
                try {
                    const kssResponse = await fetch(`/api/kss/?year=${currentYear}`);
                    allData.kss = await kssResponse.json();
                } catch (e) {
                    console.error('Ошибка загрузки KSS:', e);
                }
            }

            // Проверяем минимально необходимые данные
            if (allData.plans.status !== 'success' ||
                allData.leaks.status !== 'success' ||
                allData.remarks.status !== 'success') {
                console.warn('Не все основные данные загружены успешно', allData);
            }

            let html = '';

            reports.forEach(report => {
                const date = new Date(report.datetime).toLocaleString();
                const type = report.type === 'daily' ? 'Ежедневный отчёт' : 'Еженедельный отчёт';
                const data = report.data;

                const getRemarkData = (type) => {
                    if (!allData.remarks.data?.remarks) return null;
                    return allData.remarks.data.remarks.find(r => r.value === type) || null;
                };

                const getPlanData = (type) => {
                    if (!allData.plans.data?.plans) return null;
                    return allData.plans.data.plans.find(p => p.value === type) || null;
                };

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
                            total: allData.leaks.data?.total || 0,
                            done: allData.leaks.data?.done || 0
                        }) : ''}

                        ${data.ozp ? renderCategory('Подготовка к ОЗП', data.ozp, {
                            total: getRemarkData('ozp')?.total || 0
                        }) : ''}

                        ${data.gaz ? renderCategory('Замечания Газнадзора', data.gaz, {
                            total: getRemarkData('gaz')?.total || 0
                        }) : ''}

                        ${data.ros ? renderCategory('Замечания Ростехнадзора', data.ros, {
                            total: getRemarkData('ros')?.total || 0
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
                            total: allData.kss.data?.total || 0
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

    function renderCategory(title, data, additionalData = {}) {
        let items = '';
        const categoryClass = getCategoryClass(title);

        // Добавляем дополнительные данные в начало
        if (additionalData.total !== undefined) {
            let label = '';

            // Определяем подпись в зависимости от типа категории
            if (['Рационализаторские предложения', 'ПАТ', 'Техническая учёба'].includes(title)) {
                label = 'План на текущий год';
            }
            else if (['Подготовка к ОЗП', 'Замечания Газнадзора', 'Замечания Ростехнадзора'].includes(title)) {
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

        // Остальной код функции без изменений
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

    // Функция для определения класса по названию категории
    function getCategoryClass(title) {
        const categoryMap = {
            'АПК I уровень': 'apk',
            'АПК II уровень': 'apk',
            'Утечки газа': 'leak',
            'Подготовка к ОЗП': 'ozp',
            'Замечания Газнадзора': 'gaz',
            'Замечания Ростехнадзора': 'ros',
            'Рационализаторские предложения': 'rp',
            'ПАТ': 'pat',
            'Техническая учёба': 'tu',
            'Кольцевые сварные соединения': 'kss special', // Добавляем special класс
            'Задания на день': 'tasks',
            'Замечания по оборудованию': 'faults'
        };

        return categoryMap[title] || '';
    }

    // Функция для получения читаемого названия поля
    function getFieldLabel(fieldName) {
        const labels = {
            // Общие поля
            'tasks': 'Задания на день',
            'faults': 'Замечания по оборудованию',

            // АПК
            'apk_total': 'Всего замечаний',
            'apk_done': 'Устранено',
            'apk_undone': 'Не устранено',
            'apk_reason_undone': 'Причина неустранения',
            'apk2_total': 'Всего замечаний',
            'apk2_done': 'Устранено',
            'apk2_undone': 'Не устранено',
            'apk2_reason_undone': 'Причина неустранения',

            // Утечки
            'leak_total': 'Обнаружено утечек',
            'leak_done': 'Устранено утечек',

            // Замечания
            'ozp_done': 'Устранено',
            'ozp_undone': 'Не устранено',
            'ozp_reason_undone': 'Причина неустранения',
            'gaz_done': 'Устранено',
            'gaz_undone': 'Не устранено',
            'gaz_reason_undone': 'Причина неустранения',
            'ros_done': 'Устранено',
            'ros_undone': 'Не устранено',
            'ros_reason_undone': 'Причина неустранения',

            // Рационализаторские предложения
            'rp_done': 'Подано',
            'rp_inwork': 'В работе',

            // ПАТ и ТУ
            'pat_done': 'Проведено',
            'tu_done': 'Проведено',

            // КСС
            'kss_done': 'Выполнено'
        };

        return labels[fieldName] || fieldName;
    }

    // функция для отображения формы планирования
    function renderPlanningForm() {
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1, currentYear + 2];

        appContainer.innerHTML = `
            <div class="form-container">
                <h2>Планирование</h2>
                <form id="planningForm">
                    <div class="form-group">
                        <label for="planServiceSelect">Служба</label>
                        <select id="planServiceSelect" required>
                            <option value="">-- Выберите --</option>
                            <option value="КС-1,4">КС-1,4</option>
                            <option value="КС-2,3">КС-2,3</option>
                            <option value="КС-5,6">КС-5,6</option>
                            <option value="КС-7,8">КС-7,8</option>
                            <option value="КС-9,10">КС-9,10</option>
                            <option value="АиМО">АиМО</option>
                            <option value="ЭВС">ЭВС</option>
                            <option value="ЛЭС">ЛЭС</option>
                            <option value="СЗК">СЗК</option>
                            <option value="Связь">Связь</option>
                            <option value="ВПО">ВПО</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="planYearSelect">Год планирования</label>
                        <select id="planYearSelect" required>
                            ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group-section">
                        <div class="group-title">Замечания</div>
                        <div class="form-group">
                            <label>Всего замечаний ОЗП</label>
                            <input type="number" name="ozp_total">
                        </div>
                        <div class="form-group">
                            <label>Всего замечаний Газнадзор</label>
                            <input type="number" name="gaz_total">
                        </div>
                        <div class="form-group">
                            <label>Всего замечаний Ростехнадзор</label>
                            <input type="number" name="ros_total">
                        </div>
                    </div>

                    <div class="form-group-section form-group-rp">
                        <div class="group-title">Рационализаторские предложения (РП)</div>
                        <div class="form-group">
                            <label>Всего на год</label>
                            <input type="number" name="rp_total">
                        </div>
                        <div class="form-group">
                            <label>1 квартал</label>
                            <input type="number" name="rp_q1">
                        </div>
                        <div class="form-group">
                            <label>2 квартал</label>
                            <input type="number" name="rp_q2">
                        </div>
                        <div class="form-group">
                            <label>3 квартал</label>
                            <input type="number" name="rp_q3">
                        </div>
                        <div class="form-group">
                            <label>4 квартал</label>
                            <input type="number" name="rp_q4">
                        </div>
                    </div>

                    <div class="form-group-section form-group-pat">
                        <div class="group-title">ПАТ</div>
                        <div class="form-group">
                            <label>Всего на год</label>
                            <input type="number" name="pat_total">
                        </div>
                        <div class="form-group">
                            <label>1 квартал</label>
                            <input type="number" name="pat_q1">
                        </div>
                        <div class="form-group">
                            <label>2 квартал</label>
                            <input type="number" name="pat_q2">
                        </div>
                        <div class="form-group">
                            <label>3 квартал</label>
                            <input type="number" name="pat_q3">
                        </div>
                        <div class="form-group">
                            <label>4 квартал</label>
                            <input type="number" name="pat_q4">
                        </div>
                    </div>

                    <div class="form-group-section form-group-tu">
                        <div class="group-title">Техническая учёба (ТУ)</div>
                        <div class="form-group">
                            <label>Всего на год</label>
                            <input type="number" name="tu_total">
                        </div>
                        <div class="form-group">
                            <label>1 квартал</label>
                            <input type="number" name="tu_q1">
                        </div>
                        <div class="form-group">
                            <label>2 квартал</label>
                            <input type="number" name="tu_q2">
                        </div>
                        <div class="form-group">
                            <label>3 квартал</label>
                            <input type="number" name="tu_q3">
                        </div>
                        <div class="form-group">
                            <label>4 квартал</label>
                            <input type="number" name="tu_q4">
                        </div>
                    </div>

                    <button type="submit" class="submit-button">Сохранить план</button>
                </form>
            </div>
        `;

        // Обработчик отправки формы планирования
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

                // Собираем все данные формы
                formData.forEach((value, key) => {
                    if (value) data[key] = value;
                });

                const response = await fetch('/api/planning/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken,
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    // Показываем уведомление в интерфейсе
                    const notification = document.createElement('div');
                    notification.className = 'success-notification';
                    notification.innerHTML = '✓ Данные планирования сохранены';
                    document.body.appendChild(notification);

                    // Убираем уведомление через 2 секунды
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        setTimeout(() => notification.remove(), 300);
                    }, 4000);

                    // Возвращаем на начальный экран
                    setTimeout(() => {
                        dataInputBtn.click();
                        renderDataInputForm();
                    }, 500);
                } else {
                    throw new Error(result.message || 'Ошибка сохранения данных планирования');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                // Показываем ошибку только если что-то пошло не так
                alert(error.message || 'Ошибка при сохранении данных планирования');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });
    }
});
