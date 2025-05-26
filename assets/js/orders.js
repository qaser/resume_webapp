// orders.js
export default class OrdersManager {
    constructor(api, csrfToken) {
        this.api = api;
        this.csrfToken = csrfToken;
        this.services = [
            'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
            'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
        ];
    }

    async renderOrderForm(isAdmin) {
        const template = await this.loadTemplate('order-form', {
            showForm: isAdmin,
            services: this.services
        });
        return { html: template, init: () => this.initOrderForm(isAdmin) };
    }

    async loadTemplate(templateName, data = {}) {
        try {
            const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
            const response = await fetch(`${basePath}/${templateName}.html`);

            if (!response.ok) throw new Error('Template not found');

            let html = await response.text();

            // Обработка services отдельно
            if (data.services) {
                const servicesHtml = data.services.map(service =>
                    `<button type="button" class="service-btn" data-service="${service}">${service}</button>`
                ).join('');
                html = html.replace('{{services}}', servicesHtml);
            }

            // Обработка остальных данных
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'services') {
                    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
                }
            }

            return html;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<div class="error">Ошибка загрузки шаблона: ${templateName}</div>`;
        }
    }

    initOrderForm(isAdmin) {
        const orderForm = document.getElementById("orderForm");
        const ordersList = document.getElementById("ordersList");
        const currentUserDepartment = localStorage.getItem("department");

        if (!isAdmin && orderForm) {
            orderForm.style.display = 'none';
        }

        if (isAdmin && orderForm) {
            const serviceButtons = document.querySelectorAll('#serviceButtons .service-btn');
            const selectedDepartments = new Set();

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

            orderForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    if (selectedDepartments.size === 0) {
                        throw new Error("Не выбраны службы для выполнения");
                    }

                    const formData = new FormData(orderForm);
                    const data = {
                        date: formData.get('date'),
                        num: formData.get('num'),
                        text: formData.get('text'),
                        departments: Array.from(selectedDepartments),
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addOrder(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Распоряжение успешно добавлено', 'success');
                        orderForm.reset();
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
                <div class="order-tags">
                    ${order.departments.map(dept => {
                        // Показываем тег только если это админ или текущая служба пользователя
                        if (isAdmin || dept === currentUserDepartment) {
                            const isDone = order.done && order.done[dept];
                            return `
                                <span class="order-tag
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

        return `
            <div class="order-item" data-id="${order._id}">
                <div class="order-header">
                    <div class="order-num">№${order.num}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString()}</div>
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
