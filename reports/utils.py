import random
import string
from pymongo import MongoClient
from datetime import datetime
import re


def generate_password(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

def insert_users():
    client = MongoClient("mongodb://localhost:27017/")
    db = client['report_webapp']
    users_collection = db['users']

    departments = [
        "КС-1,4", "КС-2,3", "КС-5,6", "КС-7,8", "КС-9,10", 'ГКС',
        "АиМО", "ЭВС", "ЛЭС", "СЗК", "Связь", "ВПО", "Админ"
    ]

    users_data = []
    for idx, department in enumerate(departments, start=1):
        user = {
            '_id': idx,
            'department': department,
            'is_admin': False,
            # 'password': 'qwerty'
            'password': generate_password()
        }
        users_data.append(user)

    users_collection.insert_many(users_data)
    print("Пользователи успешно добавлены.")


def get_user_passwords_sms_text():
    client = MongoClient("mongodb://localhost:27017/")
    db = client['report_webapp']
    users_collection = db['users']

    users = users_collection.find({}, {'_id': 0, 'department': 1, 'password': 1})
    lines = [f"{user['department']} - {user['password']}" for user in users]

    sms_text = '\n'.join(lines)
    return sms_text


def parse_departments(text):
    """Парсит текст с ответственными службами и возвращает список конкретных служб"""
    if not text:
        return []

    text = text.lower().strip()
    departments = set()

    # Сначала ищем конкретные упоминания отдельных КС
    kcs_patterns = {
        'кс-1,4': ['КС-1,4'],
        'кс-2,3': ['КС-2,3'],
        'кс-5,6': ['КС-5,6'],
        'кс-7,8': ['КС-7,8'],
        'кс-9,10': ['КС-9,10'],
    }

    for pattern, kcs in kcs_patterns.items():
        if re.search(r'\b' + re.escape(pattern) + r'\b', text):
            departments.update(kcs)

    # Ищем общие упоминания служб
    general_patterns = {
        'начальник гкс': ['ГКС'],
        'начальники кс': ['КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10'],
        'начальник службы аимо': ['АиМО'],
        'начальник службы эвс': ['ЭВС'],
        'начальник службы лэс': ['ЛЭС'],
        'начальник службы сзк': ['СЗК'],
        'начальник службы связь': ['Связь'],
        'начальник службы впо': ['ВПО'],
        'инженер': ['ГКС'],
        'эого': ['ГКС'],
        'техдиагностик': ['ГКС'],
        'аимо': ['АиМО'],
        'эвс': ['ЭВС'],
        'лэс': ['ЛЭС'],
        'сзк': ['СЗК'],
        'связь': ['Связь'],
        'впо': ['ВПО'],
    }

    for pattern, depts in general_patterns.items():
        if re.search(r'\b' + re.escape(pattern) + r'\b', text):
            departments.update(depts)

    # Обработка сложных случаев
    if 'все типы гпа' in text and not departments:
        departments.update(['КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10', 'ГКС'])

    # Если нашли конкретные КС, но нет общих "начальники кс", то не добавляем все КС
    has_specific_kcs = any(dept.startswith('КС-') for dept in departments)
    has_general_kcs = any('начальники кс' in pattern for pattern in general_patterns if re.search(r'\b' + re.escape(pattern) + r'\b', text))

    if not has_specific_kcs and not has_general_kcs:
        # Если не нашли никаких КС, но есть упоминание ремонта или инженеров - добавляем ГКС
        if any(word in text for word in ['ремонт', 'инженер', 'эого', 'техдиагност', 'гкс']):
            departments.add('ГКС')

    return list(departments)


def find_header_row(sheet):
    """Находит строку с заголовками таблицы"""
    header_keywords = [
        'наименование мероприятия',
        'сроки реализации',
        'ответственные',
        'примечание',
        'оборудование',
        '№ п/п'
    ]

    # Ищем строку, содержащую несколько ключевых слов
    for row in range(1, min(20, sheet.max_row + 1)):  # Проверяем первые 20 строк
        keyword_count = 0
        for col in range(1, sheet.max_column + 1):
            cell_value = sheet.cell(row=row, column=col).value
            if cell_value:
                cell_text = str(cell_value).lower()
                if any(keyword in cell_text for keyword in header_keywords):
                    keyword_count += 1

        # Если нашли достаточно ключевых слов, считаем это строкой заголовков
        if keyword_count >= 2:
            return row

    # Альтернативный поиск: ищем первую непустую строку с данными
    for row in range(1, sheet.max_row + 1):
        has_data = False
        for col in range(1, sheet.max_column + 1):
            cell_value = sheet.cell(row=row, column=col).value
            if cell_value and str(cell_value).strip():
                has_data = True
                break

        if has_data:
            # Проверяем, что это не просто номер строки
            first_cell = sheet.cell(row=row, column=1).value
            if first_cell and not str(first_cell).strip().isdigit():
                return row

    return None


def parse_date_to_dmy(value):
    """Парсит дату и возвращает в формате ДД.ММ.ГГГГ"""
    if not value:
        return ""

    # Если это уже datetime объект
    if isinstance(value, datetime):
        return value.strftime('%d.%m.%Y')

    # Если это строка, пробуем распарсить
    if isinstance(value, str):
        value = value.strip()

        # Пробуем разные форматы дат
        date_formats = [
            '%Y-%m-%d',      # 2024-12-31
            '%d.%m.%Y',      # 31.12.2024
            '%d/%m/%Y',      # 31/12/2024
            '%d-%m-%Y',      # 31-12-2024
            '%Y.%m.%d',      # 2024.12.31
        ]

        for date_format in date_formats:
            try:
                date_obj = datetime.strptime(value, date_format)
                return date_obj.strftime('%d.%m.%Y')
            except ValueError:
                continue

    # Если не удалось распарсить как дату, возвращаем как есть (для периодичности типа "Постоянно")
    return str(value)
