import BaseManager from './base-manager.js';

export default class FaultsManager extends BaseManager {
    constructor(api, csrfToken) {
        super(api, csrfToken, 'faults');
        this.faultTypes = ['Газнадзор', 'Ростехнадзор'];
        this.sortOptions = {
            ...this.sortOptions,
            type: 'По типу'
        };
    }

    async renderFaultsForm(isAdmin) {
        const template = await this.loadTemplate('faults-form', {
            showForm: isAdmin,
            services: this.services,
            faultTypes: this.faultTypes,
            displayType: 'select' // Явно указываем select для faults
        });
        return { html: template, init: () => this.initFaultsForm(isAdmin) };
    }

    initFaultsForm(isAdmin) {
        const faultsForm = document.getElementById("faultsForm");
        const faultsList = document.getElementById("faultsList");
        const currentUserDepartment = localStorage.getItem("department");

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

        this.loadFaults(faultsList, isAdmin, currentUserDepartment);
    }

    async loadFaults(container, isAdmin, currentUserDepartment) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';

        try {
            const result = await this.api.getFaults();

            if (result.status === 'success') {
                if (result.faults && result.faults.length > 0) {
                    let filteredFaults = result.faults.filter(fault => !fault.archived);

                    // Фильтрация по типу
                    filteredFaults = this.filterItems(filteredFaults, this.currentFilter);

                    // Фильтрация для не-админов
                    if (!isAdmin) {
                        filteredFaults = filteredFaults.filter(fault =>
                            fault.department === currentUserDepartment
                        );
                    }

                    // Сортировка
                    filteredFaults = this.sortItems(filteredFaults);

                    let html = filteredFaults.map(fault =>
                        this.renderFaultItem(fault, isAdmin, currentUserDepartment)
                    ).join('');

                    container.innerHTML = `
                        <div class="controls-container">
                            ${this.createFilterControls([
                                { value: 'all', label: 'Все' },
                                ...this.faultTypes.map(type => ({ value: type, label: type }))
                            ])}
                            ${this.createSortControls()}
                        </div>
                        <div class="faults-container">
                            ${html || '<div class="no-data">Нет активных замечаний</div>'}
                        </div>
                    `;

                    this.initFilterControls(container, () =>
                        this.loadFaults(container, isAdmin, currentUserDepartment)
                    );
                    this.initSortControls(container, () =>
                        this.loadFaults(container, isAdmin, currentUserDepartment)
                    );
                    this.initFaultActions(container, isAdmin, currentUserDepartment);
                } else {
                    container.innerHTML = `
                        <div class="controls-container">
                            ${this.createFilterControls([
                                { value: 'all', label: 'Все' },
                                ...this.faultTypes.map(type => ({ value: type, label: type }))
                            ])}
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
                    <div class="department-tags">
                        <div class="department-tag">${fault.department}</div>
                    </div>
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
        container.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const faultId = btn.dataset.id;
                const faultItem = btn.closest('.fault-item');

                const success = await this.handleArchive(
                    faultId,
                    this.api.archiveFault.bind(this.api),
                    '✓ Замечание архивировано'
                );

                if (success) {
                    faultItem.remove();
                }
            });
        });

        container.querySelectorAll('.mark-done-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const faultId = btn.dataset.id;
                const faultItem = btn.closest('.fault-item');

                const success = await this.handleMarkDone(
                    faultId,
                    currentUserDepartment,
                    this.api.markFaultDone.bind(this.api),
                    '✓ Замечание отмечено выполненным'
                );

                if (success) {
                    const fault = await this.getFaultById(faultId);
                    if (fault) {
                        const faultHtml = this.renderFaultItem(fault, isAdmin, currentUserDepartment);
                        faultItem.outerHTML = faultHtml;
                        this.initFaultActions(container, isAdmin, currentUserDepartment);
                    }
                }
            });
        });
    }

    async getFaultById(faultId) {
        try {
            const result = await this.api.getFaults();
            return result.faults?.find(f => f._id === faultId) || null;
        } catch (error) {
            console.error('Ошибка получения замечания:', error);
            return null;
        }
    }
}
