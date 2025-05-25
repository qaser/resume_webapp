// protocols.js
export default class ProtocolsManager {
    constructor(api, csrfToken) {
        this.api = api;
        this.csrfToken = csrfToken;
    }

    async renderProtocolForm(isAdmin) {
        const template = await this.loadTemplate('protocol-form', {
            showForm: isAdmin
        });
        return { html: template, init: () => this.initProtocolForm(isAdmin) };
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

    initProtocolForm(isAdmin) {
        const protocolForm = document.getElementById("protocolForm");
        const protocolsList = document.getElementById("protocolsList");

        if (!isAdmin && protocolForm) {
            protocolForm.style.display = 'none';
        }

        if (isAdmin && protocolForm) {
            protocolForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.classList.add('loading');

                try {
                    const formData = new FormData(protocolForm);
                    const data = {
                        date: formData.get('date'),
                        text: formData.get('text'),
                        csrfmiddlewaretoken: this.csrfToken
                    };

                    const result = await this.api.addProtocol(data);

                    if (result.status === 'success') {
                        this.showNotification('✓ Протокол успешно добавлен', 'success');
                        protocolForm.reset();
                        await this.loadProtocols(protocolsList, isAdmin);
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

        this.loadProtocols(protocolsList, isAdmin);
    }

    async loadProtocols(container, isAdmin) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getProtocols();

            if (result.status === 'success') {
                if (result.protocols && result.protocols.length > 0) {
                    let html = '';

                    result.protocols.forEach(protocol => {
                        if (!protocol.archived) {
                            html += this.renderProtocolItem(protocol, isAdmin);
                        }
                    });

                    container.innerHTML = '<h3>Список протоколов</h3>' +
                        (html || '<div class="no-data">Нет активных протоколов</div>');

                    this.initProtocolActions(container, isAdmin);
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

    renderProtocolItem(protocol, isAdmin) {
        const completedByHtml = protocol.done && Object.keys(protocol.done).length > 0
            ? `
                <div class="protocol-completed">
                    <div class="completed-label">Выполнено:</div>
                    <div class="completed-list">
                        ${Object.entries(protocol.done)
                            .map(([dept, date]) => {
                                const formattedDate = new Date(date).toLocaleDateString();
                                return `<div class="completed-item">${dept} (${formattedDate})</div>`;
                            })
                            .join('')}
                    </div>
                </div>
            `
            : '<div class="protocol-completed">Не выполнено</div>';

        return `
            <div class="protocol-item" data-id="${protocol._id}">
                <div class="protocol-info">
                    <div class="protocol-date">${new Date(protocol.date).toLocaleDateString()}</div>
                    <div class="protocol-text">${protocol.text}</div>
                    ${completedByHtml}
                </div>
                ${isAdmin ? `
                    <div class="protocol-actions">
                        <button class="archive-btn" data-id="${protocol._id}">Архивировать</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    initProtocolActions(container, isAdmin) {
        if (!isAdmin) return;

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
