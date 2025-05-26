// faults.js
export default class FaultsManager {
    constructor(api, csrfToken) {
        this.api = api;
        this.csrfToken = csrfToken;
        this.services = [
            'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
            'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
        ];
        this.faultTypes = ['Газнадзор', 'Ростехнадзор'];
    }

    async renderFaultsForm(isAdmin) {
        const template = await this.loadTemplate('faults-form', {
            showForm: isAdmin,
            services: this.services,
            faultTypes: this.faultTypes
        });
        return { html: template, init: () => this.initFaultsForm(isAdmin) };
    }

    async loadTemplate(templateName, data = {}) {
        try {
            const scriptPath = document.currentScript?.src || new URL(import.meta.url).pathname;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/') + 1);
            const response = await fetch(`${basePath}/${templateName}.html`);

            if (!response.ok) throw new Error('Template not found');

            let html = await response.text();

            // Обработка services для select
            if (data.services) {
                const servicesHtml = data.services.map(service =>
                    `<option value="${service}">${service}</option>`
                ).join('');
                html = html.replace('{{services}}', servicesHtml);
            }

            // Обработка faultTypes для select
            if (data.faultTypes) {
                const typesHtml = data.faultTypes.map(type =>
                    `<option value="${type}">${type}</option>`
                ).join('');
                html = html.replace('{{faultTypes}}', typesHtml);
            }

            // Обработка остальных данных
            for (const [key, value] of Object.entries(data)) {
                if (!['services', 'faultTypes'].includes(key)) {
                    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
                }
            }

            return html;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            return `<div class="error">Ошибка загрузки шаблона: ${templateName}</div>`;
        }
    }

    initFaultsForm(isAdmin) {
        const faultsForm = document.getElementById("faultsForm");
        const faultsList = document.getElementById("faultsList");
        const currentUserDepartment = localStorage.getItem("department");
        const filterButtons = document.querySelectorAll('.fault-filter-btn');

        // Для не-админов скрываем форму добавления
        if (!isAdmin && faultsForm) {
            faultsForm.style.display = 'none';
        }

        if (isAdmin && faultsForm) {
            faultsForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    const formData = new FormData(faultsForm);
                    const departmentSelect = document.getElementById("faultDepartment");

                    if (!departmentSelect.value) {
                        document.getElementById("departmentError").style.display = 'block';
                        throw new Error("Не выбрана служба для замечания");
                    } else {
                        document.getElementById("departmentError").style.display = 'none';
                    }

                    const data = {
                        type: formData.get('type'),
                        date: formData.get('date'),
                        text: formData.get('text'),
                        department: departmentSelect.value,
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addFault(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Замечание успешно добавлено', 'success');
                        faultsForm.reset();
                        await this.loadFaults(faultsList, isAdmin, currentUserDepartment);
                    } else {
                        throw new Error(result.message || 'Ошибка добавления замечания');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при добавлении замечания', 'error');
                } finally {
                    submitBtn.classList.remove('loading');
                }
            });
        }

        // Обработка фильтров
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.loadFaults(faultsList, isAdmin, currentUserDepartment, button.dataset.type);
            });
        });

        // Загрузка замечаний
        this.loadFaults(faultsList, isAdmin, currentUserDepartment);
    }

    async loadFaults(container, isAdmin, currentUserDepartment, filterType = 'all') {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getFaults();

            if (result.status === 'success') {
                if (result.faults && result.faults.length > 0) {
                    let html = '';

                    result.faults.forEach(fault => {
                        if (!fault.archived) {
                            // Фильтрация по типу
                            if (filterType !== 'all' && fault.type !== filterType) {
                                return;
                            }

                            // Для не-админов показываем только замечания для их службы
                            if (!isAdmin && fault.department !== currentUserDepartment) {
                                return;
                            }

                            html += this.renderFaultItem(fault, isAdmin, currentUserDepartment);
                        }
                    });

                    container.innerHTML = `
                        <div class="faults-filter">
                            <button class="fault-filter-btn active" data-type="all">Все</button>
                            ${this.faultTypes.map(type => `
                                <button class="fault-filter-btn" data-type="${type}">${type}</button>
                            `).join('')}
                        </div>
                        <div class="faults-container">
                            ${html || '<div class="no-data">Нет активных замечаний</div>'}
                        </div>
                    `;

                    this.initFaultActions(container, isAdmin, currentUserDepartment);
                } else {
                    container.innerHTML = `
                        <div class="faults-filter">
                            <button class="fault-filter-btn active" data-type="all">Все</button>
                            ${this.faultTypes.map(type => `
                                <button class="fault-filter-btn" data-type="${type}">${type}</button>
                            `).join('')}
                        </div>
                        <div class="no-data">Нет активных замечаний</div>
                    `;
                }
            } else {
                throw new Error(result.message || 'Ошибка загрузки замечаний');
            }
        } catch (error) {
            console.error('Ошибка загрузки замечаний:', error);
            container.innerHTML = `
                <div class="error">
                    Ошибка загрузки замечаний
                    <div class="error-detail">${error.message}</div>
                </div>
            `;
        }
    }

    renderFaultItem(fault, isAdmin, currentUserDepartment) {
        const isDone = fault.is_done;
        const doneDate = isDone ? new Date(fault.date_done).toLocaleDateString() : '';
        const deadlineDate = new Date(fault.date).toLocaleDateString();

        // Кнопки действий
        const actionButtons = `
            <div class="fault-actions">
                ${!isDone ? `
                    <button class="mark-done-btn" data-id="${fault._id}">
                        Отметить выполненным
                    </button>
                ` : ''}
                ${isAdmin ? `
                    <button class="archive-btn" data-id="${fault._id}">
                        Архивировать
                    </button>
                ` : ''}
            </div>
        `;

        return `
            <div class="fault-item ${isDone ? 'done' : ''}" data-id="${fault._id}">
                <div class="fault-header">
                    <div class="fault-type">${fault.type}</div>
                    <div class="fault-department">${fault.department}</div>
                </div>

                <div class="fault-text">${fault.text}</div>

                <div class="fault-dates">
                    <div class="fault-deadline ${new Date(fault.date) < new Date() && !isDone ? 'overdue' : ''}">
                        Срок: ${deadlineDate}
                    </div>
                    ${isDone ? `
                        <div class="fault-done-date">
                            Выполнено: ${doneDate}
                        </div>
                    ` : ''}
                </div>

                ${actionButtons}
            </div>
        `;
    }

    initFaultActions(container, isAdmin, currentUserDepartment) {
        // Обработка архивирования (для админов)
        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const faultId = btn.dataset.id;
                const faultItem = btn.closest('.fault-item');

                if (confirm('Вы уверены, что хотите архивировать это замечание?')) {
                    try {
                        const result = await this.api.archiveFault(faultId);

                        if (result.status === 'success') {
                            this.showNotification('✓ Замечание архивировано', 'success');
                            faultItem.remove();
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

        // Обработка отметки выполнения
        container.querySelectorAll('.mark-done-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const faultId = btn.dataset.id;
                const faultItem = btn.closest('.fault-item');

                try {
                    const result = await this.api.markFaultDone(faultId);

                    if (result.status === 'success') {
                        this.showNotification('✓ Замечание отмечено выполненным', 'success');
                        // Обновляем отображение замечания
                        const fault = await this.getFaultById(faultId);
                        if (fault) {
                            const faultHtml = this.renderFaultItem(fault, isAdmin, currentUserDepartment);
                            faultItem.outerHTML = faultHtml;
                        }
                    } else {
                        throw new Error(result.message || 'Ошибка обновления замечания');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    this.showNotification(error.message || 'Ошибка при обновлении замечания', 'error');
                }
            });
        });

        // Обработка фильтров
        container.querySelectorAll('.fault-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.fault-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadFaults(container, isAdmin, currentUserDepartment, btn.dataset.type);
            });
        });
    }

    async getFaultById(faultId) {
        try {
            const result = await this.api.getFaults();
            if (result.status === 'success' && result.faults) {
                return result.faults.find(f => f._id === faultId);
            }
            return null;
        } catch (error) {
            console.error('Ошибка получения замечания:', error);
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
