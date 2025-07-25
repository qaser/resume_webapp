// data-input.js
export default class DataInputManager {
    constructor(apiService, appContainer, csrfToken) {
        this.api = apiService;
        this.appContainer = appContainer;
        this.csrfToken = csrfToken;
    }

    async render() {
        this.appContainer.innerHTML = await this.loadTemplate('data-input-form');

        const currentUserDepartment = localStorage.getItem("department");
        this.isAdmin = currentUserDepartment === "Админ";

        if (!this.isAdmin) {
            const currentServiceInfo = document.getElementById("currentServiceInfo");
            const currentServiceValue = document.getElementById("currentServiceValue");

            if (currentServiceInfo && currentServiceValue) {
                currentServiceInfo.style.display = "block";
                currentServiceValue.textContent = currentUserDepartment;
            }
        }

        this.initForm();
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

    initForm() {
        this.reportForm = document.getElementById("reportForm");
        this.dynamicFields = document.getElementById("dynamicFields");
        this.typeButtons = document.querySelectorAll(".type-button");
        this.serviceButtonsContainer = document.getElementById("serviceButtonsContainer");
        this.serviceButtons = document.querySelectorAll("#serviceButtons .service-btn");

        this.currentType = null;
        this.currentService = this.isAdmin ? null : localStorage.getItem("department");

        if (!this.isAdmin) {
            this.serviceButtonsContainer.style.display = "none";
        }

        this.typeButtons.forEach(button => {
            button.addEventListener("click", async () => {
                this.typeButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                this.currentType = button.dataset.type;
                document.getElementById("typeError").style.display = "none";

                if (this.isAdmin) {
                    this.serviceButtonsContainer.style.display = "block";
                    this.reportForm.style.display = "none";
                    this.currentService = null;
                    this.serviceButtons.forEach(btn => btn.classList.remove("active"));
                } else {
                    try {
                        this.dynamicFields.innerHTML = await this.loadTemplate(this.currentType);
                        await this.loadAdditionalFields(this.currentType, this.currentService);
                        this.reportForm.style.display = "block";
                    } catch (error) {
                        console.error('Error loading form:', error);
                        this.dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
                    }
                }
            });
        });

        if (this.isAdmin) {
            this.serviceButtons.forEach(button => {
                button.addEventListener("click", async () => {
                    this.serviceButtons.forEach(btn => btn.classList.remove("active"));
                    button.classList.add("active");
                    this.currentService = button.dataset.service;
                    document.getElementById("serviceError").style.display = "none";

                    try {
                        this.dynamicFields.innerHTML = await this.loadTemplate(this.currentType);
                        await this.loadAdditionalFields(this.currentType, this.currentService);
                        this.reportForm.style.display = "block";
                    } catch (error) {
                        console.error('Error loading form:', error);
                        this.dynamicFields.innerHTML = `<p>Error loading form: ${error.message}</p>`;
                    }
                });
            });
        }

        this.reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.classList.add('loading');

            try {
                if (!this.currentType) {
                    throw new Error("Не выбран тип отчета");
                }
                if (!this.currentService) {
                    throw new Error("Не выбрана служба");
                }

                const formData = new FormData(this.reportForm);
                const data = {
                    service: this.currentService,
                    type: this.currentType,
                    csrfmiddlewaretoken: this.csrfToken
                };

                const hideForServices = ['ВПО', 'Связь'];
                if (!hideForServices.includes(this.currentService) && this.currentType === 'weekly') {
                    const leakTotal = formData.get('leak_total');
                    const leakDone = formData.get('leak_done');
                    if (leakTotal !== null) data.leak_total = parseInt(leakTotal) || 0;
                    if (leakDone !== null) data.leak_done = parseInt(leakDone) || 0;
                }

                if (this.currentService === 'ЛЭС' && this.currentType === 'weekly') {
                    const kssDone = formData.get('kss_done');
                    if (kssDone) {
                        data.kss_done = parseInt(kssDone);
                    }
                }

                if (this.currentType === 'weekly') {
                    document.querySelectorAll('.protocol-action-btn').forEach(btn => {
                        const protocolId = btn.dataset.id;
                        data[`protocol_${protocolId}`] = btn.classList.contains('done') ? 'on' : 'off';
                    });
                }

                formData.forEach((value, key) => {
                    data[key] = value;
                });

                const result = await this.api.submitReport(data);

                if (result.status === 'success') {
                    this.showNotification('✓ Данные успешно сохранены', 'success');
                    this.reportForm.reset();

                    setTimeout(() => {
                        this.typeButtons.forEach(btn => btn.classList.remove("active"));
                        if (this.isAdmin) {
                            this.serviceButtons.forEach(btn => btn.classList.remove("active"));
                            this.serviceButtonsContainer.style.display = "none";
                        }
                        this.reportForm.style.display = "none";
                        this.currentType = null;
                        this.currentService = this.isAdmin ? null : localStorage.getItem("department");
                    }, 1000);
                } else {
                    throw new Error(result.message || 'Ошибка сохранения данных');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                this.showNotification(error.message || 'Ошибка при сохранении данных', 'error');
            } finally {
                submitBtn.classList.remove('loading');
            }
        });
    }

    async loadAdditionalFields(type, service) {
        if (type === 'weekly') {
            const leaksHtml = await this.loadTemplate('leaks-field');
            this.dynamicFields.insertAdjacentHTML('beforeend', leaksHtml);

            const leaksSection = document.querySelector('.form-group-leak');
            if (leaksSection) {
                const hideForServices = ['ВПО', 'Связь'];
                const hidden = hideForServices.includes(service);
                leaksSection.style.display = hidden ? 'none' : 'block';
                leaksSection.querySelectorAll("input, textarea, select").forEach(el => {
                    el.disabled = hidden;
                });
            }

            const kssHtml = await this.loadTemplate('kss-field');
            this.dynamicFields.insertAdjacentHTML('beforeend', kssHtml);

            const kssSection = document.querySelector('.form-group-kss');
            if (kssSection) {
                const hidden = service !== 'ЛЭС';
                kssSection.style.display = hidden ? 'none' : 'block';
                kssSection.querySelectorAll("input, textarea, select").forEach(el => {
                    el.disabled = hidden;
                });
            }

            // await this.loadProtocolsForReport(service);
        }

        const allInputs = this.dynamicFields.querySelectorAll("input[type='number']");
        allInputs.forEach(input => {
            if (input.name.includes("undone")) {
                input.addEventListener("input", () => {
                    const container = input.closest(".form-group-section");
                    const reasonField = container.querySelector(".reason-field");
                    if (!reasonField) return;

                    const val = parseInt(input.value.trim());
                    reasonField.style.display = val > 0 ? "block" : "none";
                });
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
