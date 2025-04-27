import json
from datetime import datetime
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from report_webapp.utils import reports, plans, kss, remarks, leaks

# Константы для преобразования имен полей
FIELD_NAMES = {
    # Общие поля
    'tasks': 'Задания на день',
    'faults': 'Замечания по оборудованию',

    # АПК
    'apk_total': 'Всего замечаний АПК I уровня',
    'apk_done': 'Устранено замечаний АПК I уровня',
    'apk_undone': 'Не устранено замечаний АПК I уровня',
    'apk_reason_undone': 'Причина неустранения АПК I уровня',
    'apk2_total': 'Всего замечаний АПК II уровня',
    'apk2_done': 'Устранено замечаний АПК II уровня',
    'apk2_undone': 'Не устранено замечаний АПК II уровня',
    'apk2_reason_undone': 'Причина неустранения АПК II уровня',

    # Утечки
    'leak_total': 'Обнаружено утечек',
    'leak_done': 'Устранено утечек',

    # Замечания
    'ozp_done': 'Устранено замечаний ОЗП',
    'ozp_undone': 'Не устранено замечаний ОЗП',
    'ozp_reason_undone': 'Причина неустранения ОЗП',
    'gaz_done': 'Устранено замечаний Газнадзора',
    'gaz_undone': 'Не устранено замечаний Газнадзора',
    'gaz_reason_undone': 'Причина неустранения Газнадзора',
    'ros_done': 'Устранено замечаний Ростехнадзора',
    'ros_undone': 'Не устранено замечаний Ростехнадзора',
    'ros_reason_undone': 'Причина неустранения Ростехнадзора',

    # Рационализаторские предложения
    'rp_done': 'Подано РП',
    'rp_inwork': 'В работе РП',

    # ПАТ и ТУ
    'pat_done': 'Проведено ПАТ',
    'tu_done': 'Проведено ТУ',

    # КСС
    'kss_done': 'Выполнено КСС'
}

# Категории отчетов и их поля
REPORT_CATEGORIES = {
    'apk': ['apk_total', 'apk_done', 'apk_undone', 'apk_reason_undone'],
    'apk2': ['apk2_total', 'apk2_done', 'apk2_undone', 'apk2_reason_undone'],
    'leak': ['leak_total', 'leak_done'],
    'ozp': ['ozp_done', 'ozp_undone', 'ozp_reason_undone'],
    'gaz': ['gaz_done', 'gaz_undone', 'gaz_reason_undone'],
    'ros': ['ros_done', 'ros_undone', 'ros_reason_undone'],
    'rp': ['rp_done', 'rp_inwork'],
    'pat': ['pat_done'],
    'tu': ['tu_done'],
    'kss': ['kss_done']
}

# Типы замечаний для планирования
REMARK_TYPES = ['ozp', 'gaz', 'ros']

# Типы планов для планирования
PLAN_TYPES = ['rp', 'pat', 'tu']

@csrf_exempt
def handle_report(request):
    """
    Основной обработчик для работы с отчетами (GET и POST запросы)
    """
    try:
        if request.method == 'POST':
            return _handle_report_post(request)
        elif request.method == 'GET':
            return _handle_report_get(request)
        return _error_response('Неверный метод запроса', status=405)
    except json.JSONDecodeError:
        return _error_response('Неверный формат JSON')
    except Exception as e:
        return _error_response(str(e))

def _handle_report_post(request):
    """
    Обработка POST запроса для создания нового отчета
    """
    data = json.loads(request.body)
    current_year = datetime.now().year

    # Валидация обязательных полей
    if not data.get('service') or not data.get('type'):
        return _error_response('Не указана служба или тип отчета')

    report_data = _prepare_report_data(data)
    _save_report_and_update_related(report_data, current_year)

    return _success_response('Данные успешно сохранены')

def _prepare_report_data(data):
    """
    Подготавливает данные отчета для сохранения в БД
    """
    report_data = {
        'department': data['service'],
        'type': data['type'],
        'datetime': datetime.now(),
        'data': {
            'tasks': data.get('task', ''),
            'faults': data.get('faults', '')
        }
    }

    # Добавляем данные по категориям
    for category, fields in REPORT_CATEGORIES.items():
        category_data = _process_category_data(data, fields)
        if category_data:
            report_data['data'][category] = category_data

    return report_data

def _process_category_data(data, fields):
    """
    Обрабатывает данные конкретной категории
    """
    category_data = {}
    for field in fields:
        if field in data:
            value = data[field]
            if value is None:
                continue

            # Обработка полей разных типов
            if 'reason' in field:
                category_data[field] = str(value)
            elif any(x in field for x in ['total', 'done', 'undone', 'inwork']):
                try:
                    category_data[field] = int(value)
                except (ValueError, TypeError):
                    category_data[field] = 0
            else:
                category_data[field] = value

    return category_data or None

def _save_report_and_update_related(report_data, year):
    """
    Сохраняет отчет и обновляет связанные коллекции
    """
    # Сохранение основного отчета
    reports.insert_one(report_data)

    # Обновление связанных данных
    _update_leaks(report_data, year)
    _update_kss(report_data, year)
    _update_remarks(report_data, year)

def _update_leaks(report_data, year):
    """
    Обновляет данные по утечкам газа
    """
    if 'leak' in report_data['data']:
        leak_data = report_data['data']['leak']
        leaks.update_one(
            {'year': year, 'department': report_data['department']},
            {
                '$inc': {
                    'total': leak_data.get('leak_total', 0),
                    'done': leak_data.get('leak_done', 0)
                },
                '$setOnInsert': {'datetime': datetime.now()}
            },
            upsert=True
        )

def _update_kss(report_data, year):
    """
    Обновляет данные по кольцевым сварным соединениям
    """
    if 'kss' in report_data['data']:
        kss_done = report_data['data']['kss'].get('kss_done', 0)
        if kss_done > 0:
            kss.update_one(
                {'year': year},
                {
                    '$inc': {'total': kss_done},
                    '$setOnInsert': {'datetime': datetime.now()}
                },
                upsert=True
            )

def _update_remarks(report_data, year):
    """
    Обновляет данные по замечаниям (ОЗП, Газнадзор, Ростехнадзор)
    """
    department = report_data['department']
    now = datetime.now()

    for remark_type in REMARK_TYPES:
        if remark_type in report_data['data']:
            remark_done = report_data['data'][remark_type].get(f'{remark_type}_done', 0)
            if remark_done > 0:
                remarks.update_one(
                    {
                        'year': year,
                        'value': remark_type,
                        'department': department
                    },
                    {
                        '$inc': {'done': remark_done},
                        '$setOnInsert': {'datetime': now}
                    },
                    upsert=True
                )

def _handle_report_get(request):
    """
    Обработка GET запроса для получения отчетов
    """
    service = request.GET.get('service')
    if not service:
        return _error_response('Не указана служба')

    daily_report = _get_latest_report(service, 'daily')
    weekly_report = _get_latest_report(service, 'weekly')

    result = []
    if daily_report:
        result.append(_format_report(daily_report))
    if weekly_report:
        result.append(_format_report(weekly_report))

    return _success_response(data={'reports': result})

def _get_latest_report(service, report_type):
    """
    Получает последний отчет указанного типа для службы
    """
    return reports.find_one(
        {'department': service, 'type': report_type},
        {'_id': 0, 'data': 1, 'datetime': 1, 'type': 1},
        sort=[('datetime', -1)]
    )

def _format_report(report):
    """
    Форматирует отчет для ответа API
    """
    report['datetime'] = report['datetime'].isoformat()
    return report

@csrf_exempt
def handle_planning(request):
    """
    Обработчик для работы с планированием
    """
    try:
        if request.method == 'POST':
            return _handle_planning_post(request)
        return _error_response('Неверный метод запроса', status=405)
    except json.JSONDecodeError:
        return _error_response('Неверный формат JSON')
    except Exception as e:
        return _error_response(str(e))

def _handle_planning_post(request):
    """
    Обработка POST запроса для сохранения планов
    """
    data = json.loads(request.body)

    # Валидация обязательных полей
    if not data.get('service') or not data.get('year'):
        return _error_response('Не указана служба или год')

    # Сохранение замечаний
    _save_remarks(data)

    # Сохранение планов
    _save_plans(data)

    return _success_response('Данные планирования успешно сохранены')

def _save_remarks(data):
    """
    Сохраняет данные по замечаниям (ОЗП, Газнадзор, Ростехнадзор)
    """
    department = data['service']
    year = int(data['year'])
    now = datetime.now()

    for remark_type in REMARK_TYPES:
        total = data.get(f'{remark_type}_total')
        if total:
            remark_data = {
                'department': department,
                'year': year,
                'datetime': now,
                'value': remark_type,
                'total': int(total),
                'done': 0
            }
            remarks.replace_one(
                {'department': department, 'year': year, 'value': remark_type},
                remark_data,
                upsert=True
            )

def _save_plans(data):
    """
    Сохраняет данные по планам (РП, ПАТ, ТУ)
    """
    department = data['service']
    year = int(data['year'])
    now = datetime.now()

    for plan_type in PLAN_TYPES:
        total = data.get(f'{plan_type}_total')
        if total:
            plan_data = {
                'department': department,
                'datetime': now,
                'year': year,
                'value': plan_type,
                'total': int(total),
                'quarters': {
                    '1': int(data.get(f'{plan_type}_q1', 0)),
                    '2': int(data.get(f'{plan_type}_q2', 0)),
                    '3': int(data.get(f'{plan_type}_q3', 0)),
                    '4': int(data.get(f'{plan_type}_q4', 0))
                }
            }
            plans.replace_one(
                {'department': department, 'year': year, 'value': plan_type},
                plan_data,
                upsert=True
            )

def get_reports(request):
    """
    Альтернативный endpoint для получения отчетов (совместимость)
    """
    return _handle_report_get(request)

def index(request):
    """
    Основная страница приложения
    """
    return render(request, 'report_webapp/index.html')

def view_data(request):
    """
    Страница просмотра данных
    """
    return render(request, 'report_webapp/index.html', {
        'services': [
            'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
            'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
        ]
    })

@csrf_exempt
def get_leaks(request):
    """
    Получение данных по утечкам
    """
    try:
        department = request.GET.get('department')
        year = request.GET.get('year')

        if not department or not year:
            return _error_response('Не указана служба или год')

        leaks_data = leaks.find_one(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'total': 1, 'done': 1}
        )

        return _success_response(data={
            'total': leaks_data.get('total', 0),
            'done': leaks_data.get('done', 0)
        })
    except Exception as e:
        return _error_response(str(e))

@csrf_exempt
def get_kss(request):
    """
    Получение данных по кольцевым сварным соединениям
    """
    try:
        year = request.GET.get('year')
        if not year:
            return _error_response('Не указан год')

        kss_data = kss.find_one(
            {'year': int(year)},
            {'_id': 0, 'total': 1}
        )

        return _success_response(data={
            'total': kss_data.get('total', 0)
        })
    except Exception as e:
        return _error_response(str(e))

@csrf_exempt
def get_remarks(request):
    """
    Получение данных по замечаниям
    """
    try:
        department = request.GET.get('department')
        year = request.GET.get('year')

        if not department or not year:
            return _error_response('Не указана служба или год')

        remarks_list = list(remarks.find(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'value': 1, 'total': 1, 'done': 1}
        ))

        return _success_response(data={
            'remarks': remarks_list
        })
    except Exception as e:
        return _error_response(str(e))

@csrf_exempt
def get_plans(request):
    """
    Получение данных по планам
    """
    try:
        department = request.GET.get('department')
        year = request.GET.get('year')

        if not department or not year:
            return _error_response('Не указана служба или год')

        plans_list = list(plans.find(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'value': 1, 'total': 1, 'quarters': 1}
        ))

        return _success_response(data={
            'plans': plans_list
        })
    except Exception as e:
        return _error_response(str(e))

# Вспомогательные функции для формирования ответов
def _success_response(message=None, data=None):
    """
    Формирует успешный JSON-ответ
    """
    response = {'status': 'success'}
    if message:
        response['message'] = message
    if data:
        response.update(data)
    return JsonResponse(response)

def _error_response(message, status=400):
    """
    Формирует JSON-ответ с ошибкой
    """
    return JsonResponse(
        {'status': 'error', 'message': message},
        status=status
    )
