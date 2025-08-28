import BaseManager from './base-manager.js';

export default class ReliabilityManager extends BaseManager {
    constructor(api, csrfToken) {
        super(api, csrfToken, 'reliability');
    }

    async renderReliabilityForm(isAdmin) {
        const template = await this.loadTemplate('reliability-form', {
            showForm: isAdmin,
            services: this.services,
            displayType: 'buttons'
        });
        return { html: template, init: () => this.initReliabilityForm(isAdmin) };
    }

    initReliabilityForm(isAdmin) {
        const reliabilityForm = document.getElementById("reliabilityForm");
        const reliabilityList = document.getElementById("reliabilityList");
        const uploadBtn = document.getElementById("uploadExcelBtn");
        const currentUserDepartment = localStorage.getItem("department");
        const selectedDepartments = new Set(); // Выносим наружу

        if (!isAdmin && reliabilityForm) {
            reliabilityForm.style.display = 'none';
        }

        if (isAdmin && reliabilityForm) {
            // Кнопка загрузки Excel (пока заглушка)
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => {
                    this.handleExcelUpload();
                });
            }

            const serviceButtonsContainer = document.getElementById("serviceButtons");
            // const selectedDepartments = new Set();
            this.initServiceButtons(serviceButtonsContainer, selectedDepartments);

            reliabilityForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    if (selectedDepartments.size === 0) {
                        throw new Error("Не выбраны службы для выполнения");
                    }

                    const formData = new FormData(reliabilityForm);
                    const data = {
                        name: formData.get('name'),
                        date: formData.get('date'),
                        note: formData.get('note'),
                        departments: Array.from(selectedDepartments),
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addReliability(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Мероприятие успешно добавлено', 'success');
                        reliabilityForm.reset();
                    // Исправляем очистку кнопок
                        const serviceButtons = serviceButtonsContainer.querySelectorAll('.service-btn');
                        serviceButtons.forEach(btn => btn.classList.remove('active'));
                        selectedDepartments.clear();
                        await this.loadReliabilityItems(reliabilityList, isAdmin, currentUserDepartment);
                    } else {
                        throw new Error(result.message || 'Ошибка добавления мероприятия');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при добавлении мероприятия', 'error');
                } finally {
                    submitBtn.classList.remove('loading');
                }
            });
        }

        this.loadReliabilityItems(reliabilityList, isAdmin, currentUserDepartment);
    }

    async loadReliabilityItems(container, isAdmin, currentUserDepartment) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getReliabilityItems();

            if (result.status === 'success') {
                if (result.items && result.items.length > 0) {
                    let html = '';

                    result.items.forEach(item => {
                        if (!item.archived) {
                            // Для не-админов показываем только распоряжения для их службы
                            if (!isAdmin && (!item.departments ||
                                !item.departments.includes(currentUserDepartment))) {
                                return;
                            }
                            html += this.renderReliabilityItem(item, isAdmin, currentUserDepartment);
                        }
                    });

                    container.innerHTML = '<h3>Мероприятия по надёжности</h3>' +
                        (html || '<div class="no-data">Нет мероприятий</div>');

                    this.initReliabilityActions(container, isAdmin, currentUserDepartment);
                } else {
                    container.innerHTML = '<h3>Мероприятия по надёжности</h3><div class="no-data">Нет мероприятий</div>';
                }
            } else {
                throw new Error(result.message || 'Ошибка загрузки мероприятий');
            }
        } catch (error) {
            console.error('Ошибка загрузки мероприятий:', error);
            container.innerHTML = `
                <div class="error">
                    Ошибка загрузки мероприятий
                    <div class="error-detail">${error.message}</div>
                </div>
            `;
        }
    }

    renderReliabilityItem(item, isAdmin, currentUserDepartment) {
        const departmentsTags = item.departments && item.departments.length > 0
            ? `
                <div class="department-tags">
                    ${item.departments.map(dept => {
                        // Показываем тег только если это админ или текущая служба пользователя
                        if (isAdmin || dept === currentUserDepartment) {
                            const isDone = item.done && item.done[dept];
                            return `
                                <span class="department-tag
                                        ${dept === currentUserDepartment ? 'current' : ''}
                                        ${isDone ? 'done' : ''}">
                                    ${dept}
                                </span>
                            `;
                        }
                        return ''; // Для других служб не рендерим тег
                    }).join('')}
                </div>
            `
            : '';

        // Статус выполнения для текущего пользователя
        const isDoneForCurrentUser = item.done && item.done[currentUserDepartment];

        // Кнопка выполнения (только для назначенных мероприятий)
        const actionButton = !isAdmin &&
            item.departments &&
            item.departments.includes(currentUserDepartment)
                ? `
                    <button class="order-action-btn ${isDoneForCurrentUser ? 'done' : ''}"
                            data-id="${item._id}">
                        ${isDoneForCurrentUser ? 'Выполнено' : 'Отметить выполнение'}
                    </button>
                `
                : '';

        // Кнопка архивирования (только для админа)
        const archiveButton = isAdmin
            ? `
                <button class="archive-btn" data-id="${item._id}">
                    Архивировать
                </button>
            `
            : '';

        return `
            <div class="reliability-item" data-id="${item._id}">
                <div class="reliability-header">
                    <div class="reliability-name">${item.name}</div>
                </div>

                ${departmentsTags}

                <div class="reliability-date">Срок реализации: ${item.date}</div>
                ${item.note ? `<div class="reliability-note">${item.note}</div>` : ''}

                <div class="reliability-footer">
                    ${actionButton}
                    ${archiveButton}
                </div>
            </div>
        `;
    }

    initReliabilityActions(container, isAdmin, currentUserDepartment) {
        // Обработка архивирования (для админов)
        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                const itemElement = btn.closest('.reliability-item');

                if (confirm('Вы уверены, что хотите архивировать это мероприятие?')) {
                    try {
                        const result = await this.api.archiveReliability(itemId);

                        if (result.status === 'success') {
                            this.showNotification('✓ Мероприятие архивировано', 'success');
                            itemElement.remove();
                        } else {
                            throw new Error(result.message || 'Ошибка архивирования');
                        }
                    } catch (error) {
                        console.error('Ошибка:', error);
                        this.showNotification(error.message || 'Ошибка архивирования', 'error');
                    }
                }
            });
        });

        // Обработка отметки выполнения (для не-админов)
        container.querySelectorAll('.order-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                const itemElement = btn.closest('.reliability-item');

                try {
                    const result = await this.api.markReliabilityDone(
                        itemId,
                        currentUserDepartment,
                        new Date().toISOString()
                    );

                    if (result.status === 'success') {
                        this.showNotification('✓ Мероприятие отмечено выполненным', 'success');
                        // Обновляем отображение мероприятия
                        const item = await this.getReliabilityById(itemId);
                        if (item) {
                            const itemHtml = this.renderReliabilityItem(item, isAdmin, currentUserDepartment);
                            itemElement.outerHTML = itemHtml;
                            // Реинициализируем обработчики для нового элемента
                            this.initReliabilityActions(container, isAdmin, currentUserDepartment);
                        }
                    } else {
                        throw new Error(result.message || 'Ошибка обновления мероприятия');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при обновлении мероприятия', 'error');
                }
            });
        });
    }

    async getReliabilityById(itemId) {
        try {
            const result = await this.api.getReliabilityItems();
            if (result.status === 'success' && result.items) {
                return result.items.find(o => o._id === itemId);
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения распоряжения:', error);
            return null;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}-notification`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Добавим новый метод для обработки загрузки Excel
    async handleExcelUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('excel_file', file);

            try {
                this.showNotification('Загрузка файла...', 'info');
                const result = await this.api.uploadReliabilityExcel(formData);

                if (result.status === 'success') {
                    this.showNotification(result.message, 'success');
                    // Перезагружаем список мероприятий
                    const reliabilityList = document.getElementById("reliabilityList");
                    const currentUserDepartment = localStorage.getItem("department");
                    await this.loadReliabilityItems(reliabilityList, true, currentUserDepartment);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Ошибка загрузки Excel:', error);
                this.showNotification(error.message || 'Ошибка при загрузке файла', 'error');
            }
        };

        input.click();
    }
}
