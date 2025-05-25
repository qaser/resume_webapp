// static/js/login.js
import ApiService from './api.js';

export function initLogin(csrfToken, staticUrl) {
  const api = new ApiService(csrfToken, staticUrl);

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Загружаем список отделов
      const departments = await api.getDepartments();
      const select = document.getElementById("department");

      // Очищаем и добавляем новые опции
      select.innerHTML = '<option value="" disabled selected>Выберите службу</option>';
      departments.forEach(dep => {
        const option = document.createElement("option");
        option.value = dep;
        option.textContent = dep;
        select.appendChild(option);
      });

      // Создаем элемент для отображения ошибки
      const passwordField = document.getElementById("password");
      const errorElement = document.createElement("div");
      errorElement.className = "error-message";
      errorElement.style.display = "none";
      passwordField.parentNode.insertBefore(errorElement, passwordField.nextSibling);

      // Обработка формы
      document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const department = document.getElementById("department").value;
        const password = document.getElementById("password").value;
        const submitButton = e.target.querySelector('button[type="submit"]');

        // Скрываем предыдущую ошибку
        errorElement.style.display = "none";
        errorElement.textContent = "";

        submitButton.disabled = true;
        submitButton.textContent = "Вход...";

        try {
          const response = await api.authenticate(department, password);

          // Проверяем, содержит ли ответ токен
          if (!response || !response.token) {
            throw new Error("Неверный пароль");
          }

          // Сохраняем данные в localStorage
          localStorage.setItem("department", department);
          localStorage.setItem("auth_token", response.token);

          // Перенаправляем на главную страницу
          window.location.href = "/";
        } catch (error) {
          console.error("Ошибка аутентификации:", error);
          // Показываем ошибку пользователю
          errorElement.textContent = "Неверный пароль. Пожалуйста, попробуйте снова.";
          errorElement.style.display = "block";
          passwordField.focus();
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = "Войти";
        }
      });
    } catch (error) {
      console.error("Ошибка загрузки списка отделов:", error);
      // Можно добавить обработку ошибки загрузки отделов
    }
  });
}
