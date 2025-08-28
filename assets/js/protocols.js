import BaseManager from './base-manager.js';

export default class ProtocolsManager extends BaseManager {
    constructor(api, csrfToken) {
        super(api, csrfToken, 'orders');
    }

    validateDeadlineFormat(deadline) {
        // Проверяем формат дд.мм.гггг
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
        return dateRegex.test(deadline) || deadline.trim().length > 0;
    }

    async renderProtocolForm(isAdmin) {
        const template = await this.loadTemplate('protocol-form', {
            showForm: isAdmin,
            services: this.services,
            displayType: 'buttons' // Указываем тип отображения
        });
        return { html: template, init: () => this.initProtocolForm(isAdmin) };
    }

    initProtocolForm(isAdmin) {
        const protocolForm = document.getElementById("protocolForm");
        const protocolsList = document.getElementById("protocolsList");
        const currentUserDepartment = localStorage.getItem("department");
        const selectedDepartments = new Set(); // Выносим наружу

        if (!isAdmin && protocolForm) {
            protocolForm.style.display = 'none';
        }

        if (isAdmin && protocolForm) {
            const serviceButtonsContainer = document.getElementById("serviceButtons");
            const selectedDepartments = new Set();

            this.initServiceButtons(serviceButtonsContainer, selectedDepartments);

            protocolForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    if (selectedDepartments.size === 0) {
                        throw new Error("Не выбраны службы для выполнения");
                    }

                    const formData = new FormData(protocolForm);
                    const deadline = formData.get('deadline');

                    // Проверяем формат срока исполнения
                    if (!this.validateDeadlineFormat(deadline)) {
                        throw new Error("Введите дату исполнения в формате дд.мм.гггг или текстовое описание");
                    }

                    const data = {
                        issue_date: formData.get('issue_date'),  // Новая дата выхода
                        protocol_num: formData.get('protocol_num'),  // Номер протокола
                        protocol_name: formData.get('protocol_name'),  // Название протокола
                        deadline: deadline,  // Текстовый срок исполнения
                        text: formData.get('text'),
                        departments: Array.from(selectedDepartments),
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addProtocol(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Протокол успешно добавлен', 'success');
                        protocolForm.reset();

                        const serviceButtons = serviceButtonsContainer.querySelectorAll('.service-btn');
                        serviceButtons.forEach(btn => btn.classList.remove('active'));
                        selectedDepartments.clear();

                        await this.loadProtocols(protocolsList, isAdmin, currentUserDepartment);
                    } else {
                        throw new Error(result.message || 'Ошибка добавления протокола');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при добавлении протокола', 'error');
                } finally {
                    submitBtn.classList.remove('loading');
                }
            });
        }

        this.loadProtocols(protocolsList, isAdmin, currentUserDepartment);
    }

    async loadProtocols(container, isAdmin, currentUserDepartment) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getProtocols();

            if (result.status === 'success') {
                if (result.protocols && result.protocols.length > 0) {
                    let html = '';

                    result.protocols.forEach(protocol => {
                        if (!protocol.archived) {
                            // Для не-админов показываем только протоколы для их службы
                            if (!isAdmin && (!protocol.departments ||
                                !protocol.departments.includes(currentUserDepartment))) {
                                return;
                            }
                            html += this.renderProtocolItem(protocol, isAdmin, currentUserDepartment);
                        }
                    });

                    container.innerHTML = '<h3>Список протоколов</h3>' +
                        (html || '<div class="no-data">Нет активных протоколов</div>');

                    this.initProtocolActions(container, isAdmin, currentUserDepartment);
                } else {
                    container.innerHTML = '<h3>Список протоколов</h3><div class="no-data">Нет активных протоколов</div>';
                }
            } else {
                throw new Error(result.message || 'Ошибка загрузки протоколов');
            }
        } catch (error) {
            console.error('Ошибка загрузки протоколов:', error);
            container.innerHTML = `
                <div class="error">
                    Ошибка загрузки протоколов
                    <div class="error-detail">${error.message}</div>
                </div>
            `;
        }
    }

    renderProtocolItem(protocol, isAdmin, currentUserDepartment) {
        // Рендерим службы как теги с цветовой индикацией
        const departmentsTags = protocol.departments && protocol.departments.length > 0
            ? `
                <div class="department-tags">
                    ${protocol.departments.map(dept => {
                        const isDone = protocol.done && protocol.done[dept];
                        return `
                            <span class="department-tag
                                    ${dept === currentUserDepartment ? 'current' : ''}
                                    ${isDone ? 'done' : ''}">
                                ${dept}
                            </span>
                        `;
                    }).join('')}
                </div>
            `
            : '';

        // Статус выполнения для текущего пользователя
        const isDoneForCurrentUser = protocol.done && protocol.done[currentUserDepartment];

        // Кнопка выполнения (только для назначенных протоколов)
        const actionButton = !isAdmin &&
            protocol.departments &&
            protocol.departments.includes(currentUserDepartment)
                ? `
                    <button class="protocol-action-btn ${isDoneForCurrentUser ? 'done' : ''}"
                            data-id="${protocol._id}">
                        ${isDoneForCurrentUser ? 'Выполнено' : 'Отметить выполнение'}
                    </button>
                `
                : '';

        // Кнопка архивирования (только для админа)
        const archiveButton = isAdmin
            ? `
                <button class="archive-btn" data-id="${protocol._id}">
                    Архивировать
                </button>
            `
            : '';

        // Форматируем дату выхода
        const issueDate = protocol.issue_date
            ? new Date(protocol.issue_date).toLocaleDateString()
            : '';
        const editButton = isAdmin ? `<button class="edit-btn" data-id="${protocol._id}">Редактировать</button>` : '';
        return `
            <div class="protocol-item" data-id="${protocol._id}">
                <div class="protocol-header">
                    <div class="protocol-num">№${protocol.protocol_num} от ${issueDate}г. '${protocol.protocol_name || 'Без названия'}'</div>
                </div>
                <div class="protocol-deadline">
                    <strong>Срок исполнения:</strong> ${protocol.deadline || 'не указан'}
                </div>
                ${departmentsTags}
                <div class="protocol-text">${protocol.text}</div>
                <div class="protocol-footer">
                    ${actionButton}
                    ${editButton}
                    ${archiveButton}
                </div>
            </div>
        `;
    }

    initProtocolActions(container, isAdmin, currentUserDepartment) {
        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const protocolId = btn.dataset.id;
                const protocolItem = btn.closest('.protocol-item');

                if (confirm('Вы уверены, что хотите архивировать этот протокол?')) {
                    try {
                        const result = await this.api.archiveProtocol(protocolId);

                        if (result.status === 'success') {
                            this.showNotification('✓ Протокол архивирован', 'success');
                            protocolItem.remove();
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

        container.querySelectorAll('.protocol-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const protocolId = btn.dataset.id;
                const protocolItem = btn.closest('.protocol-item');

                try {
                    const result = await this.api.updateProtocol(
                        protocolId,
                        currentUserDepartment,
                        new Date().toISOString()
                    );

                    if (result.status === 'success') {
                        this.showNotification('✓ Протокол отмечен выполненным', 'success');
                        // Обновляем отображение протокола
                        const protocol = await this.getProtocolById(protocolId);
                        if (protocol) {
                            const protocolHtml = this.renderProtocolItem(protocol, isAdmin, currentUserDepartment);
                            protocolItem.outerHTML = protocolHtml;
                        }
                    } else {
                        throw new Error(result.message || 'Ошибка обновления протокола');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при обновлении протокола', 'error');
                }
            });
        });

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const protocolId = btn.dataset.id;
                const protocol = await this.getProtocolById(protocolId);
                if (protocol) {
                    this.fillEditForm(protocol);
                }
            });
        });
    }

    fillEditForm(protocol) {
        const form = document.getElementById('protocolForm');
        form.dataset.editId = protocol._id;
        form.querySelector('[name="protocol_num"]').value = protocol.protocol_num;
        form.querySelector('[name="protocol_name"]').value = protocol.protocol_name;
        form.querySelector('[name="issue_date"]').value = protocol.issue_date.split('T')[0];
        form.querySelector('[name="deadline"]').value = protocol.deadline;
        form.querySelector('[name="text"]').value = protocol.text;

        const serviceButtons = form.querySelectorAll('.service-btn');
        serviceButtons.forEach(btn => {
            btn.classList.toggle('active', protocol.departments.includes(btn.dataset.service));
        });

        form.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
    }

    async getProtocolById(protocolId) {
        try {
            const result = await this.api.getProtocols();
            if (result.status === 'success' && result.protocols) {
                return result.protocols.find(p => p._id === protocolId);
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения протокола:', error);
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
