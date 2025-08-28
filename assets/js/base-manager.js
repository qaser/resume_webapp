// base-manager.js
export default class BaseManager {
    constructor(api, csrfToken, entityType) {
        this.api = api;
        this.csrfToken = csrfToken;
        this.entityType = entityType;
        this.services = [
            'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
            'ГКС', 'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
        ];
        this.sortOptions = {
            date: 'По дате',
            department: 'По службе',
            status: 'По статусу'
        };
        this.currentSort = 'date';
        this.currentSortDirection = 'desc';
        this.currentFilter = 'all';
    }

    // Общие методы для загрузки шаблонов
    async loadTemplate(templateName, data = {}) {
        try {
            const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
            const response = await fetch(`${basePath}/${templateName}.html`);

            if (!response.ok) throw new Error('Template not found');

            let html = await response.text();

            // Обработка faultTypes для select
            if (data.faultTypes && data.displayType === 'select') {
                const faultTypesHtml = data.faultTypes.map(type =>
                    `<option value="${type}">${type}</option>`
                ).join('');
                html = html.replace('{{faultTypes}}', faultTypesHtml);
            }

            // Обработка services для select (options)
            if (data.services && data.displayType === 'select') {
                const servicesHtml = data.services.map(service =>
                    `<option value="${service}">${service}</option>`
                ).join('');
                html = html.replace('{{services}}', servicesHtml);
            }

            // Обработка services для кнопок
            if (data.services && data.displayType === 'buttons') {
                const servicesHtml = data.services.map(service =>
                    `<button type="button" class="service-btn" data-service="${service}">${service}</button>`
                ).join('');
                html = html.replace('{{services}}', servicesHtml);
            }

            // Обработка services по умолчанию (для обратной совместимости)
            if (data.services && !data.displayType) {
                const servicesHtml = data.services.map(service =>
                    `<option value="${service}">${service}</option>`
                ).join('');
                html = html.replace('{{services}}', servicesHtml);
            }

            // Обработка остальных данных
            for (const [key, value] of Object.entries(data)) {
                if (!['services', 'displayType'].includes(key)) {
                    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
                }
            }

            return html;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<div class="error">Ошибка загрузки шаблона: ${templateName}</div>`;
        }
    }

    // Общая валидация формата даты
    validateDateFormat(dateString) {
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
        return dateRegex.test(dateString) || dateString.trim().length > 0;
    }

    // Общий метод для показа уведомлений
    showNotification(message, type = 'success') {
        // Удаляем существующие уведомления
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}-notification`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // base-manager.js - добавьте этот метод если его нет
    initServiceButtons(container, selectedDepartments) {
        const serviceButtons = container.querySelectorAll('.service-btn');

        serviceButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                button.classList.toggle('active');
                const service = button.dataset.service;

                if (button.classList.contains('active')) {
                    selectedDepartments.add(service);
                } else {
                    selectedDepartments.delete(service);
                }
            });
        });
    }

    // Общий метод для создания элементов сортировки
    createSortControls() {
        return `
            <div class="sort-controls">
                <select class="sort-select" id="${this.entityType}SortSelect">
                    ${Object.entries(this.sortOptions).map(([value, label]) =>
                        `<option value="${value}" ${this.currentSort === value ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                </select>
                <button class="sort-direction-btn" data-direction="${this.currentSortDirection}">
                    ${this.currentSortDirection === 'asc' ? '↑' : '↓'}
                </button>
            </div>
        `;
    }

    // Общий метод для инициализации сортировки
    initSortControls(container, loadFunction) {
        const sortSelect = container.querySelector('.sort-select');
        const sortDirectionBtn = container.querySelector('.sort-direction-btn');

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                loadFunction();
            });
        }

        if (sortDirectionBtn) {
            sortDirectionBtn.addEventListener('click', () => {
                // Добавляем анимацию
                sortDirectionBtn.classList.add('changing');

                this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                sortDirectionBtn.dataset.direction = this.currentSortDirection;
                sortDirectionBtn.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';

                // Убираем анимацию после завершения
                setTimeout(() => {
                    sortDirectionBtn.classList.remove('changing');
                }, 300);

                loadFunction();
            });
        }
    }

    // Общий метод для сортировки элементов
    sortItems(items) {
        return items.sort((a, b) => {
            let valueA, valueB;

            switch (this.currentSort) {
                case 'date':
                    valueA = new Date(a.date || a.issue_date || a.createdAt);
                    valueB = new Date(b.date || b.issue_date || b.createdAt);
                    break;
                case 'department':
                    valueA = a.department || (a.departments && a.departments[0]) || '';
                    valueB = b.department || (b.departments && b.departments[0]) || '';
                    break;
                case 'status':
                    // Для статуса сортируем по выполнению
                    const currentDept = localStorage.getItem("department");
                    valueA = a.done && a.done[currentDept] ? 1 : 0;
                    valueB = b.done && b.done[currentDept] ? 1 : 0;
                    break;
                default:
                    return 0;
            }

            if (this.currentSortDirection === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
    }

    // Общий метод для фильтрации (переопределяется в дочерних классах при необходимости)
    filterItems(items, filterType = 'all') {
        return items.filter(item => {
            if (filterType !== 'all' && item.type !== filterType) {
                return false;
            }
            return true;
        });
    }

    createFilterControls(filters = []) {
        if (filters.length === 0) return '';

        return `
            <div class="faults-filter">
                ${filters.map(filter => `
                    <button class="fault-filter-btn ${this.currentFilter === filter.value ? 'active' : ''}"
                            data-type="${filter.value}">
                        ${filter.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    // Общий метод для инициализации фильтрации
    initFilterControls(container, loadFunction) {
        container.querySelectorAll('.fault-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.fault-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.type;
                loadFunction();
            });
        });
    }

    // Общий метод для архивирования
    async handleArchive(itemId, apiMethod, successMessage) {
        if (confirm('Вы уверены, что хотите архивировать этот элемент?')) {
            try {
                const result = await apiMethod(itemId);
                if (result.status === 'success') {
                    this.showNotification(successMessage, 'success');
                    return true;
                } else {
                    throw new Error(result.message || 'Ошибка архивирования');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                this.showNotification(error.message || 'Ошибка архивирования', 'error');
                return false;
            }
        }
        return false;
    }

    // Общий метод для отметки выполнения
    async handleMarkDone(itemId, department, apiMethod, successMessage) {
        try {
            const result = await apiMethod(itemId, department, new Date().toISOString());
            if (result.status === 'success') {
                this.showNotification(successMessage, 'success');
                return true;
            } else {
                throw new Error(result.message || 'Ошибка обновления');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            this.showNotification(error.message || 'Ошибка при обновлении', 'error');
            return false;
        }
    }
}
