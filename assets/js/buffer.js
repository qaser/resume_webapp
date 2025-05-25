    async function loadProtocolsForReport(service) {
        const container = document.getElementById('protocolsContainer');
        if (!container) return;

        container.innerHTML = '<div class="loading">Загрузка мероприятий...</div>';

        try {
            const response = await api.getProtocols();
            if (response.status === 'success' && response.protocols.length > 0) {
                let html = '';

                response.protocols.forEach(protocol => {
                    if (!protocol.archived) {
                        const isChecked = protocol.done && protocol.done[service];

                        html += `
                            <div class="protocol-item">
                                <div class="protocol-info">
                                    <div class="protocol-date">${new Date(protocol.date).toLocaleDateString()}</div>
                                    <div class="protocol-text">${protocol.text}</div>
                                    <div class="protocol-completed">
                                        <div class="completed-label">${isChecked ? '✓ Выполнено вашей службой' : 'Не выполнено'}</div>
                                        ${protocol.done && Object.keys(protocol.done).length > 0 ? `
                                            <div class="completed-list">
                                                ${Object.entries(protocol.done)
                                                    .map(([dept, date]) =>
                                                        `<div class="completed-item">${dept} (${new Date(date).toLocaleDateString()})</div>`
                                                    ).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <button class="protocol-action-btn ${isChecked ? 'done' : ''}"
                                        data-id="${protocol._id}"
                                        type="button">
                                    ${isChecked ? '✓ Выполнено' : 'Отметить выполненным'}
                                </button>
                            </div>
                        `;
                    }
                });

                container.innerHTML = html || '<div class="no-data">Нет активных мероприятий</div>';

                // Обработчики для кнопок протоколов
                container.querySelectorAll('.protocol-action-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const isDone = this.classList.contains('done');
                        this.classList.toggle('done');
                        this.textContent = isDone ? 'Отметить выполненным' : '✓ Выполнено';

                        // Обновляем статус в блоке информации
                        const infoBlock = this.closest('.protocol-item').querySelector('.completed-label');
                        infoBlock.textContent = isDone ? 'Не выполнено' : '✓ Выполнено вашей службой';
                    });
                });
            } else {
                container.innerHTML = '<div class="no-data">Нет активных мероприятий</div>';
            }
        } catch (error) {
            console.error('Ошибка загрузки протоколов:', error);
            container.innerHTML = '<div class="error">Ошибка загрузки мероприятий</div>';
        }
    }
