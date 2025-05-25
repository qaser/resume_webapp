// orders.js
export default class OrdersManager {
    constructor(api, csrfToken) {
        this.api = api;
        this.csrfToken = csrfToken;
    }

    async renderOrderForm(isAdmin) {
        const template = await this.loadTemplate('order-form', {
            showForm: isAdmin
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
            for (const [key, value] of Object.entries(data)) {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
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

        // Для не-админов скрываем форму добавления
        if (!isAdmin && orderForm) {
            orderForm.style.display = 'none';
        }

        // Обработка отправки формы (только для админов)
        if (isAdmin && orderForm) {
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
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addOrder(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Распоряжение успешно добавлено', 'success');
                        orderForm.reset();
                        await this.loadOrders(ordersList);
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

        // Загрузка списка распоряжений
        this.loadOrders(ordersList);
    }

    async loadOrders(container) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getOrders();

            if (result.status === 'success') {
                if (result.orders && result.orders.length > 0) {
                    let html = '';
                    result.orders.forEach(order => {
                        if (!order.archived) {
                            html += this.renderOrderItem(order);
                        }
                    });

                    container.innerHTML = '<h3>Список распоряжений (приказов)</h3>' +
                        (html || '<div class="no-data">Нет активных распоряжений</div>');

                    this.initOrderActions(container);
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

    renderOrderItem(order) {
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

        return `
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

    initOrderActions(container) {
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
