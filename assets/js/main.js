const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);

// Конфигурация приложения
const APP_CONFIG = {
  services: [
    'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
    'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
  ],
  reportTypes: ['daily', 'weekly'],
  notificationDuration: 3000
};

document.addEventListener('DOMContentLoaded', function() {
  const appContainer = document.getElementById("app-container");
  const menuButtons = {
    dataInput: document.getElementById("dataInputBtn"),
    dataView: document.getElementById("dataViewBtn"),
    dataPlan: document.getElementById("dataPlanBtn")
  };

  // Инициализация приложения
  initApp();

  /**
   * Инициализирует приложение и настраивает обработчики событий
   */
  function initApp() {
    // Обработчики для кнопок меню
    Object.entries(menuButtons).forEach(([key, button]) => {
      button.addEventListener("click", () => {
        // Устанавливаем активную кнопку
        setActiveButton(button);

        // Рендерим соответствующую форму
        switch(key) {
          case 'dataInput': renderDataInputForm(); break;
          case 'dataView': renderDataViewForm(); break;
          case 'dataPlan': renderPlanningForm(); break;
        }
      });
    });

    // По умолчанию показываем форму ввода
    menuButtons.dataInput.click();
  }

  /**
   * Устанавливает активную кнопку меню
   * @param {HTMLElement} activeButton - Кнопка, которую нужно сделать активной
   */
  function setActiveButton(activeButton) {
    Object.values(menuButtons).forEach(btn => {
      btn.classList.toggle('active', btn === activeButton);
    });
  }

  /**
   * Показывает уведомление
   * @param {string} message - Текст сообщения
   * @param {string} type - Тип уведомления (success/error)
   */
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Автоматическое скрытие уведомления
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, APP_CONFIG.notificationDuration);
  }

  /**
   * Рендерит форму ввода данных
   */
  function renderDataInputForm() {
    appContainer.innerHTML = `
      <div class="form-container">
        <h2>Ввод данных</h2>
        <div class="form-group">
          <label for="serviceSelect">Служба</label>
          <select id="serviceSelect" required>
            <option value="">-- Выберите --</option>
            ${APP_CONFIG.services.map(service =>
              `<option value="${service}">${service}</option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Тип отчета</label>
          <div class="button-group">
            ${APP_CONFIG.reportTypes.map(type =>
              `<button type="button" class="type-button" data-type="${type}">
                ${type === 'daily' ? 'Ежедневный' : 'Еженедельный'}
              </button>`
            ).join('')}
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

  /**
   * Инициализирует форму ввода данных
   */
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

    /**
     * Рендерит поля формы в зависимости от типа отчета
     * @param {string} type - Тип отчета (daily/weekly)
     */
    async function renderFields(type) {
      try {
        const response = await fetch(`${basePath}${type}.html`);
        if (!response.ok) throw new Error('Не удалось загрузить форму');

        dynamicFields.innerHTML = await response.text();
        setupReasonFields(dynamicFields);
      } catch (error) {
        console.error('Ошибка загрузки формы:', error);
        dynamicFields.innerHTML = `<p>Ошибка: ${error.message}</p>`;
      }
    }

    /**
     * Настраивает обработчики для полей с причинами
     * @param {HTMLElement} container - Контейнер с полями формы
     */
    function setupReasonFields(container) {
      const numberInputs = container.querySelectorAll("input[type='number']");

      numberInputs.forEach(input => {
        if (input.name.includes("undone")) {
          input.addEventListener("input", () => {
            const container = input.closest(".form-group-section");
            const reasonField = container?.querySelector(".reason-field");
            if (!reasonField) return;

            const value = parseInt(input.value.trim()) || 0;
            reasonField.style.display = value > 0 ? "block" : "none";
          });
        }
      });
    }

    // Обработчик отправки формы
    reportForm.addEventListener("submit", handleFormSubmit);
  }

  /**
   * Обрабатывает отправку формы
   * @param {Event} e - Событие отправки формы
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
      submitBtn.classList.add('loading');

      const formData = new FormData(form);
      const data = {
        service: document.getElementById("serviceSelect").value,
        type: document.querySelector(".type-button.active").dataset.type,
        csrfmiddlewaretoken: csrfToken
      };

      // Собираем данные формы
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка сохранения данных');
      }

      showNotification('✓ Данные успешно сохранены', 'success');
      form.reset();

      // Возвращаем на начальный экран
      setTimeout(() => {
        menuButtons.dataInput.click();
        renderDataInputForm();
      }, 1000);
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification(error.message || 'Ошибка при сохранении данных', 'error');
    } finally {
      submitBtn.classList.remove('loading');
    }
  }

/**
 * Рендерит форму просмотра данных
 */
function renderDataViewForm() {
    appContainer.innerHTML = `
      <div class="view-container">
        <h2>Просмотр данных</h2>
        <div class="service-buttons" id="serviceButtons">
          ${APP_CONFIG.services.map(service =>
            `<button class="service-btn" data-service="${service}">${service}</button>`
          ).join('')}
        </div>
        <div id="dataDisplay"></div>
      </div>
    `;

    // Обработчики для кнопок служб
    document.querySelectorAll('.service-btn').forEach(btn => {
      btn.addEventListener('click', () => handleServiceButtonClick(btn));
    });
  }

  /**
   * Обрабатывает клик по кнопке службы
   * @param {HTMLElement} button - Нажатая кнопка службы
   */
  async function handleServiceButtonClick(button) {
    // Устанавливаем активную кнопку
    document.querySelectorAll('.service-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    // Сохраняем выбранную службу и загружаем данные
    appContainer.dataset.currentDepartment = button.dataset.service;
    await loadServiceData(button.dataset.service);
  }

  /**
   * Загружает данные для выбранной службы
   * @param {string} service - Название службы
   */
  async function loadServiceData(service) {
    const dataDisplay = document.getElementById("dataDisplay");
    dataDisplay.innerHTML = '<div class="loading">Загрузка данных...</div>';

    try {
      const response = await fetch(`/api/reports/?service=${encodeURIComponent(service)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.status === 'success') {
        await renderServiceData(data.reports);
      } else {
        throw new Error(data.message || 'Неизвестная ошибка сервера');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      showErrorInDisplay(dataDisplay, error);
    }
  }

  /**
   * Отображает ошибку в контейнере данных
   * @param {HTMLElement} container - Контейнер для отображения
   * @param {Error} error - Объект ошибки
   */
  function showErrorInDisplay(container, error) {
    container.innerHTML = `
      <div class="error">
        Ошибка загрузки данных
        <div class="error-detail">${error.message}</div>
      </div>
    `;
  }

  /**
   * Рендерит данные службы
   * @param {Array} reports - Массив отчетов
   */
  async function renderServiceData(reports) {
    const dataDisplay = document.getElementById("dataDisplay");
    const currentDepartment = appContainer.dataset.currentDepartment;

    if (!reports?.length) {
      dataDisplay.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
      return;
    }

    try {
      // Загружаем дополнительные данные
      const additionalData = await loadAdditionalData(currentDepartment);

      // Рендерим каждый отчет
      dataDisplay.innerHTML = reports.map(report =>
        renderReportSection(report, additionalData)
        .join('');
    } catch (error) {
      console.error('Неожиданная ошибка:', error);
      showErrorInDisplay(dataDisplay, error);
    }
  }

  /**
   * Загружает дополнительные данные (планы, утечки, замечания)
   * @param {string} department - Название службы
   * @returns {Object} Дополнительные данные
   */
  async function loadAdditionalData(department) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const isLES = department === 'ЛЭС';

    // Параллельная загрузка данных
    const [plansData, leaksData, remarksData, kssData] = await Promise.all([
      fetchData('/api/plans/', { department, year: currentYear }),
      fetchData('/api/leaks/', { department, year: currentYear }),
      fetchData('/api/remarks/', { department, year: currentYear }),
      isLES ? fetchData('/api/kss/', { year: currentYear }) : Promise.resolve(null)
    ]);

    return {
      plans: plansData,
      leaks: leaksData,
      remarks: remarksData,
      kss: kssData,
      currentQuarter,
      isLES
    };
  }

  /**
   * Универсальная функция для загрузки данных
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Параметры запроса
   * @returns {Promise} Промис с данными
   */
  async function fetchData(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${endpoint}?${queryString}`);
      return response.ok ? response.json() : { status: 'error' };
    } catch (e) {
      console.error(`Ошибка загрузки данных из ${endpoint}:`, e);
      return { status: 'error' };
    }
  }

  /**
   * Рендерит секцию отчета
   * @param {Object} report - Данные отчета
   * @param {Object} additionalData - Дополнительные данные
   * @returns {string} HTML-строка
   */
  function renderReportSection(report, additionalData) {
    const date = new Date(report.datetime).toLocaleString();
    const type = report.type === 'daily' ? 'Ежедневный отчёт' : 'Еженедельный отчёт';
    const data = report.data;

    return `
      <div class="data-section">
        <div class="data-header">
          <h3>${type} на ${date}</h3>
        </div>
        ${renderDataGroup('Задания на день', data.tasks)}
        ${renderDataGroup('Замечания по оборудованию', data.faults)}
        ${data.apk ? renderCategory('АПК I уровень', data.apk) : ''}
        ${data.apk2 ? renderCategory('АПК II уровень', data.apk2) : ''}
        ${data.leak ? renderCategory('Утечки газа', data.leak, {
          total: additionalData.leaks.data?.total || 0,
          done: additionalData.leaks.data?.done || 0
        }) : ''}
        ${data.ozp ? renderCategory('Подготовка к ОЗП', data.ozp, {
          total: getRemarkData(additionalData.remarks, 'ozp')?.total || 0
        }) : ''}
        ${data.gaz ? renderCategory('Замечания Газнадзора', data.gaz, {
          total: getRemarkData(additionalData.remarks, 'gaz')?.total || 0
        }) : ''}
        ${data.ros ? renderCategory('Замечания Ростехнадзора', data.ros, {
          total: getRemarkData(additionalData.remarks, 'ros')?.total || 0
        }) : ''}
        ${data.rp ? renderCategory('Рационализаторские предложения', data.rp, {
          total: getPlanData(additionalData.plans, 'rp')?.total || 0,
          currentQuarter: getPlanData(additionalData.plans, 'rp')?.quarters?.[additionalData.currentQuarter] || 0
        }) : ''}
        ${data.pat ? renderCategory('ПАТ', data.pat, {
          total: getPlanData(additionalData.plans, 'pat')?.total || 0,
          currentQuarter: getPlanData(additionalData.plans, 'pat')?.quarters?.[additionalData.currentQuarter] || 0
        }) : ''}
        ${data.tu ? renderCategory('Техническая учёба', data.tu, {
          total: getPlanData(additionalData.plans, 'tu')?.total || 0,
          currentQuarter: getPlanData(additionalData.plans, 'tu')?.quarters?.[additionalData.currentQuarter] || 0
        }) : ''}
        ${(data.kss && additionalData.isLES) ? renderCategory('Кольцевые сварные соединения', data.kss, {
          total: additionalData.kss.data?.total || 0
        }) : ''}
      </div>
    `;
  }

  /**
   * Возвращает данные замечания по типу
   * @param {Object} remarksData - Все данные замечаний
   * @param {string} type - Тип замечания
   * @returns {Object|null} Данные замечания
   */
  function getRemarkData(remarksData, type) {
    if (!remarksData.data?.remarks) return null;
    return remarksData.data.remarks.find(r => r.value === type) || null;
  }

  /**
   * Возвращает данные плана по типу
   * @param {Object} plansData - Все данные планов
   * @param {string} type - Тип плана
   * @returns {Object|null} Данные плана
   */
  function getPlanData(plansData, type) {
    if (!plansData.data?.plans) return null;
    return plansData.data.plans.find(p => p.value === type) || null;
  }

  /**
   * Рендерит форму планирования
   */
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
              ${APP_CONFIG.services.map(service =>
                `<option value="${service}">${service}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="planYearSelect">Год планирования</label>
            <select id="planYearSelect" required>
              ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
          </div>

          ${renderPlanningSection('Замечания', ['ozp', 'gaz', 'ros'], 'total')}
          ${renderPlanningSection('Рационализаторские предложения (РП)', ['rp'], 'total', true)}
          ${renderPlanningSection('ПАТ', ['pat'], 'total', true)}
          ${renderPlanningSection('Техническая учёба (ТУ)', ['tu'], 'total', true)}

          <button type="submit" class="submit-button">Сохранить план</button>
        </form>
      </div>
    `;

    document.getElementById('planningForm').addEventListener('submit', handlePlanningSubmit);
  }

  /**
   * Рендерит секцию формы планирования
   * @param {string} title - Заголовок секции
   * @param {Array} types - Типы элементов
   * @param {string} fieldSuffix - Суффикс поля
   * @param {boolean} withQuarters - Включать кварталы
   * @returns {string} HTML-строка
   */
  function renderPlanningSection(title, types, fieldSuffix, withQuarters = false) {
    return `
      <div class="form-group-section form-group-${types[0]}">
        <div class="group-title">${title}</div>
        ${types.map(type => `
          <div class="form-group">
            <label>${getPlanningLabel(title, type, fieldSuffix)}</label>
            <input type="number" name="${type}_${fieldSuffix}">
          </div>
          ${withQuarters ? [1, 2, 3, 4].map(q => `
            <div class="form-group">
              <label>${q} квартал</label>
              <input type="number" name="${type}_q${q}">
            </div>
          `).join('') : ''}
        `).join('')}
      </div>
    `;
  }

  /**
   * Возвращает подпись для поля планирования
   * @param {string} title - Заголовок секции
   * @param {string} type - Тип элемента
   * @param {string} suffix - Суффикс поля
   * @returns {string} Подпись
   */
  function getPlanningLabel(title, type, suffix) {
    if (suffix === 'total') return title.includes('(') ? 'Всего' : `Всего ${type}`;
    return suffix;
  }

  /**
   * Обрабатывает отправку формы планирования
   * @param {Event} e - Событие отправки формы
   */
  async function handlePlanningSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
      submitBtn.classList.add('loading');

      const formData = new FormData(form);
      const data = {
        service: document.getElementById('planServiceSelect').value,
        year: document.getElementById('planYearSelect').value,
        csrfmiddlewaretoken: csrfToken
      };

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка сохранения данных планирования');
      }

      showNotification('✓ Данные планирования сохранены', 'success');

      // Возвращаем на начальный экран
      setTimeout(() => {
        menuButtons.dataInput.click();
        renderDataInputForm();
      }, 500);
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification(error.message || 'Ошибка при сохранении данных планирования', 'error');
    } finally {
      submitBtn.classList.remove('loading');
    }
  }
});
