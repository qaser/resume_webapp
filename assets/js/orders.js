import BaseManager from './base-manager.js';

export default class OrdersManager extends BaseManager {
    constructor(api, csrfToken) {
        super(api, csrfToken, 'orders');
    }

    async renderOrderForm(isAdmin) {
        const template = await this.loadTemplate('order-form', {
            showForm: isAdmin,
            services: this.services,
            displayType: 'buttons' // Указываем тип отображения
        });
        return { html: template, init: () => this.initOrderForm(isAdmin) };
    }

    // orders.js - исправленный метод initOrderForm
    initOrderForm(isAdmin) {
        const orderForm = document.getElementById("orderForm");
        const ordersList = document.getElementById("ordersList");
        const currentUserDepartment = localStorage.getItem("department");
        const selectedDepartments = new Set(); // Выносим наружу

        if (!isAdmin && orderForm) {
            orderForm.style.display = 'none';
        }

        if (isAdmin && orderForm) {
            const serviceButtonsContainer = document.getElementById("serviceButtons");
            // const selectedDepartments = new Set();
            // Инициализируем кнопки через базовый класс
            this.initServiceButtons(serviceButtonsContainer, selectedDepartments);

            orderForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    if (selectedDepartments.size === 0) {
                        throw new Error("Не выбраны службы для выполнения");
                    }

                    const formData = new FormData(orderForm);
                    const deadline = formData.get('deadline');

                    // Проверяем формат срока исполнения
                    if (!this.validateDeadlineFormat(deadline)) {
                        throw new Error("Введите срок исполнения в формате дд.мм.гггг или текстовое описание");
                    }

                    const data = {
                        issue_date: formData.get('issue_date'),
                        deadline: deadline,
                        text: formData.get('text'),
                        num: formData.get('num'),
                        departments: Array.from(selectedDepartments),
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addOrder(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Распоряжение успешно добавлено', 'success');
                        orderForm.reset();

                        // Исправляем очистку кнопок
                        const serviceButtons = serviceButtonsContainer.querySelectorAll('.service-btn');
                        serviceButtons.forEach(btn => btn.classList.remove('active'));
                        selectedDepartments.clear();

                        await this.loadOrders(ordersList, isAdmin, currentUserDepartment);
                    } else {
                        throw new Error(result.message || 'Ошибка добавления распоряжения');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при добавлении распоряжения', 'error');
                } finally {
                    submitBtn.classList.remove('loading');
                }
            });
        }

        this.loadOrders(ordersList, isAdmin, currentUserDepartment);
    }

    async loadOrders(container, isAdmin, currentUserDepartment) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getOrders();

            if (result.status === 'success') {
                if (result.orders && result.orders.length > 0) {
                    let html = '';

                    result.orders.forEach(order => {
                        if (!order.archived) {
                            // Для не-админов показываем только распоряжения для их службы
                            if (!isAdmin && (!order.departments ||
                                !order.departments.includes(currentUserDepartment))) {
                                return;
                            }
                            html += this.renderOrderItem(order, isAdmin, currentUserDepartment);
                        }
                    });

                    container.innerHTML = '<h3>Список распоряжений (приказов)</h3>' +
                        (html || '<div class="no-data">Нет активных распоряжений</div>');

                    this.initOrderActions(container, isAdmin, currentUserDepartment);
                } else {
                    container.innerHTML = '<h3>Список распоряжений (приказов)</h3><div class="no-data">Нет активных распоряжений</div>';
                }
            } else {
                throw new Error(result.message || 'Ошибка загрузки распоряжений');
            }
        } catch (error) {
            console.error('Ошибка загрузки распоряжений:', error);
            container.innerHTML = `
                <div class="error">
                    Ошибка загрузки распоряжений
                    <div class="error-detail">${error.message}</div>
                </div>
            `;
        }
    }

    renderOrderItem(order, isAdmin, currentUserDepartment) {
        // Рендерим службы как теги только для админов или если это текущая служба пользователя
        const departmentsTags = order.departments && order.departments.length > 0
            ? `
                <div class="department-tags">
                    ${order.departments.map(dept => {
                        // Показываем тег только если это админ или текущая служба пользователя
                        if (isAdmin || dept === currentUserDepartment) {
                            const isDone = order.done && order.done[dept];
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
        const isDoneForCurrentUser = order.done && order.done[currentUserDepartment];

        // Кнопка выполнения (только для назначенных распоряжений)
        const actionButton = !isAdmin &&
            order.departments &&
            order.departments.includes(currentUserDepartment)
                ? `
                    <button class="order-action-btn ${isDoneForCurrentUser ? 'done' : ''}"
                            data-id="${order._id}">
                        ${isDoneForCurrentUser ? 'Выполнено' : 'Отметить выполнение'}
                    </button>
                `
                : '';

        // Кнопка архивирования (только для админа)
        const archiveButton = isAdmin
            ? `
                <button class="archive-btn" data-id="${order._id}">
                    Архивировать
                </button>
            `
            : '';
        const issueDate = order.issue_date
            ? new Date(order.issue_date).toLocaleDateString()
            : '';
        return `
            <div class="order-item" data-id="${order._id}">
                <div class="order-header">
                    <div class="order-num">№${order.num} от ${issueDate}</div>
                </div>

                <div class="order-deadline">
                    <strong>Срок исполнения:</strong> ${order.deadline || 'не указан'}
                </div>

                ${departmentsTags}

                <div class="order-text">${order.text}</div>

                <div class="order-footer">
                    ${actionButton}
                    ${archiveButton}
                </div>
            </div>
        `;
    }

    validateDeadlineFormat(deadline) {
        // Проверяем формат дд.мм.гггг
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
        return dateRegex.test(deadline) || deadline.trim().length > 0;
    }

    initOrderActions(container, isAdmin, currentUserDepartment) {
        // Обработка архивирования (для админов)
        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.dataset.id;
                const orderItem = btn.closest('.order-item');

                if (confirm('Вы уверены, что хотите архивировать это распоряжение?')) {
                    try {
                        const result = await this.api.archiveOrder(orderId);

                        if (result.status === 'success') {
                            this.showNotification('✓ Распоряжение архивировано', 'success');
                            orderItem.remove();
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
                const orderId = btn.dataset.id;
                const orderItem = btn.closest('.order-item');

                try {
                    const result = await this.api.updateOrder(
                        orderId,
                        currentUserDepartment,
                        new Date().toISOString()
                    );

                    if (result.status === 'success') {
                        this.showNotification('✓ Распоряжение отмечено выполненным', 'success');
                        // Обновляем отображение распоряжения
                        const order = await this.getOrderById(orderId);
                        if (order) {
                            const orderHtml = this.renderOrderItem(order, isAdmin, currentUserDepartment);
                            orderItem.outerHTML = orderHtml;
                        }
                    } else {
                        throw new Error(result.message || 'Ошибка обновления распоряжения');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при обновлении распоряжения', 'error');
                }
            });
        });
    }

    async getOrderById(orderId) {
        try {
            const result = await this.api.getOrders();
            if (result.status === 'success' && result.orders) {
                return result.orders.find(o => o._id === orderId);
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
}
