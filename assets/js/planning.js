export default class PlanningManager {
    constructor(api, csrfToken) {
        this.api = api;
        this.csrfToken = csrfToken;
    }

    async renderPlanningForm(isAdmin) {
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear + 1, currentYear + 2];
        const currentUserDepartment = localStorage.getItem("department");

        // Подготавливаем опции для служб
        let serviceOptions = '';
        if (isAdmin) {
            serviceOptions = `
                <option value="">-- Выберите службу --</option>
                <option value="ГКС">ГКС</option>
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
            `;
        } else {
            serviceOptions = `<option value="${currentUserDepartment}" selected>${currentUserDepartment}</option>`;
        }

        const templateData = {
            yearOptions: years.map(year => `<option value="${year}">${year}</option>`).join(''),
            serviceOptions: serviceOptions,
            currentDepartment: currentUserDepartment
        };

        const template = await this.loadTemplate('planning-form', templateData);
        return { html: template, init: () => this.initPlanningForm(isAdmin, currentUserDepartment) };
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

    initPlanningForm(isAdmin, currentUserDepartment) {
        const form = document.getElementById('planningForm');
        const serviceSelect = document.getElementById('planServiceSelect');

        // Для не-админов заменяем select на отображение department
        if (!isAdmin) {
            const formGroup = serviceSelect.closest('.form-group');
            formGroup.innerHTML = `
                <label>Служба</label>
                <div class="current-department">${currentUserDepartment}</div>
                <input type="hidden" id="planServiceSelect" value="${currentUserDepartment}">
            `;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                const formData = new FormData(form);
                const data = {
                    service: isAdmin ? serviceSelect.value : currentUserDepartment,
                    year: document.getElementById('planYearSelect').value,
                    csrfmiddlewaretoken: this.csrfToken
                };

                formData.forEach((value, key) => {
                    if (value) data[key] = value;
                });

                const result = await this.api.savePlan(data);

                if (result.status === 'success') {
                    this.showNotification('✓ План успешно сохранён', 'success');
                } else {
                    throw new Error(result.message || 'Ошибка сохранения плана');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                this.showNotification(error.message || 'Ошибка при сохранении плана', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
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
