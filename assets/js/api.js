class ApiService {
    constructor(csrfToken) {
        this.csrfToken = csrfToken;
    }

    // Отправка отчета
    async submitReport(data) {
        const response = await fetch('/api/reports/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    // Получение отчетов по службе
    async getReports(service) {
        const response = await fetch(`/api/reports/?service=${encodeURIComponent(service)}&all=true`);
        return await response.json();
    }

    // Получение планов
    async getPlans(department, year) {
        const response = await fetch(`/api/plans/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    }

    // Получение данных по утечкам
    async getLeaks(department, year) {
        const response = await fetch(`/api/leaks/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    }

    // Получение замечаний
    async getRemarks(department, year) {
        const response = await fetch(`/api/remarks/?department=${encodeURIComponent(department)}&year=${year}`);
        return await response.json();
    }

    // Получение данных по КСС (только для ЛЭС)
    async getKss(year) {
        const response = await fetch(`/api/kss/?year=${year}`);
        return await response.json();
    }

    // Сохранение плана
    async savePlan(data) {
        const response = await fetch('/api/planning/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async getProtocols() {
        const response = await fetch('/api/protocols/');
        return await response.json();
    }

    // Добавление протокола
    async addProtocol(data) {
        const response = await fetch('/api/protocols/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    // Архивирование протокола
    async archiveProtocol(id) {
        const response = await fetch(`/api/protocols/${id}/archive/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.csrfToken,
            }
        });
        return await response.json();
    }

    async updateProtocol(protocolId, service, doneDate) {
        const response = await fetch(`/api/protocols/${protocolId}/done/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify({ service, done_date: doneDate })
        });
        return await response.json();
    }

    async getOrders() {
        const response = await fetch('/api/orders/');
        return await response.json();
    }

    // Добавление распоряжений
    async addOrder(data) {
        const response = await fetch('/api/orders/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    // Архивирование распоряжения
    async archiveOrder(id) {
        const response = await fetch(`/api/orders/${id}/archive/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.csrfToken,
            }
        });
        return await response.json();
    }

    async updateOrder(orderId, service, doneDate) {
        const response = await fetch(`/api/orders/${orderId}/done/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify({ service, done_date: doneDate })
        });
        return await response.json();
    }

    async getDepartments() {
        const response = await fetch("/api/departments/");
        return await response.json();
    }

    async authenticate(department, password) {
        const response = await fetch("/api/authenticate/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": this.csrfToken
        },
        body: JSON.stringify({ department, password })
        });

        if (!response.ok) {
        throw new Error("Ошибка аутентификации");
        }

        const data = await response.json();

        // Проверяем, что сервер вернул токен
        if (!data.token) {
        throw new Error("Неверные учетные данные");
        }

        return data;
    }

    async getFaults() {
        const response = await fetch('/api/faults/');
        return await response.json();
    }

    async addFault(data) {
        const response = await fetch('/api/faults/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async archiveFault(id) {
        const response = await fetch(`/api/faults/${id}/archive/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.csrfToken,
            }
        });
        return await response.json();
    }

    async markFaultDone(id) {
        const response = await fetch(`/api/faults/${id}/done/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            body: JSON.stringify({ done_date: new Date().toISOString() })
        });
        return await response.json();
    }
}

// Экспортируем класс для использования в других файлах
export default ApiService;
