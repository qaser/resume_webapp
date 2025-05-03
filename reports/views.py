import json
from bson import ObjectId
from datetime import datetime
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from report_webapp.utils import reports, plans, kss, remarks, leaks, protocols

# Словарь для преобразования технических имен в читаемые
FIELD_NAMES_MAPPING = {
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
    'apk4_done': 'Устранено замечаний АПК IV уровня',
    'apk4_undone': 'Не устранено замечаний АПК IV уровня',
    'apk4_reason_undone': 'Причина неустранения АПК IV уровня',
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

@csrf_exempt
def handle_report(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            current_year = datetime.now().year
            service = data.get('service')

            # Подготовка данных для сохранения
            report_data = {
                'department': service,
                'type': data.get('type'),
                'datetime': datetime.now(),
                'data': {}
            }

            # Удаляем служебные поля
            data.pop('service', None)
            data.pop('type', None)

            # Группируем данные по категориям
            categories = {
                'apk': ['apk_total', 'apk_done', 'apk_undone', 'apk_reason_undone'],
                'apk2': ['apk2_total', 'apk2_done', 'apk2_undone', 'apk2_reason_undone'],
                'leak': ['leak_total', 'leak_done'],
                'apk4': ['apk4_done', 'apk4_undone', 'apk4_reason_undone'],
                'ozp': ['ozp_done', 'ozp_undone', 'ozp_reason_undone'],
                'gaz': ['gaz_done', 'gaz_undone', 'gaz_reason_undone'],
                'ros': ['ros_done', 'ros_undone', 'ros_reason_undone'],
                'rp': ['rp_done', 'rp_inwork'],
                'pat': ['pat_done'],
                'tu': ['tu_done'],
                'kss': ['kss_done']
            }

            # Основные поля
            report_data['data']['tasks'] = data.get('task', '')
            report_data['data']['faults'] = data.get('faults', '')

            # Обрабатываем категории
            for category, fields in categories.items():
                category_data = {}
                for field in fields:
                    if field in data:
                        value = data[field]
                        # Для полей с причинами оставляем текст как есть
                        if 'reason' in field:
                            category_data[field] = str(value) if value is not None else ''
                        # Для числовых полей преобразуем в int
                        elif any(x in field for x in ['total', 'done', 'undone', 'inwork']):
                            try:
                                category_data[field] = int(value) if value else 0
                            except (ValueError, TypeError):
                                category_data[field] = 0
                        # Все остальные поля оставляем как есть
                        else:
                            category_data[field] = value

                if category_data:  # Добавляем только если есть данные
                    report_data['data'][category] = category_data

            # Сохраняем в MongoDB
            reports.insert_one(report_data)

            # Обновляем дополнительные коллекции
            update_related_collections(report_data, current_year)

            protocol_updates = {}
            for key, value in data.items():
                if key.startswith('protocol_') and value == 'on':
                    protocol_id = key.replace('protocol_', '')
                    protocol_updates[protocol_id] = datetime.now()

            if protocol_updates:
                for protocol_id, done_date in protocol_updates.items():
                    protocols.update_one(
                        {'_id': ObjectId(protocol_id)},
                        {'$set': {f'done.{service}': done_date}}
                    )

            return JsonResponse({'status': 'success', 'message': 'Данные успешно сохранены'})
        except Exception as e:
            return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': str(e)}))

    elif request.method == 'GET':
        try:
            service = request.GET.get('service')
            if not service:
                return JsonResponse({'status': 'error', 'message': 'Не указана служба'}, status=400)

            # Получаем последний ежедневный и еженедельный отчеты
            daily_report = reports.find_one(
                {'department': service, 'type': 'daily'},
                {'_id': 0, 'data': 1, 'datetime': 1, 'type': 1},
                sort=[('datetime', -1)]
            )

            weekly_report = reports.find_one(
                {'department': service, 'type': 'weekly'},
                {'_id': 0, 'data': 1, 'datetime': 1, 'type': 1},
                sort=[('datetime', -1)]
            )

            reports_list = []
            if daily_report:
                daily_report['datetime'] = daily_report['datetime'].isoformat()
                reports_list.append(daily_report)
            if weekly_report:
                weekly_report['datetime'] = weekly_report['datetime'].isoformat()
                reports_list.append(weekly_report)

            return JsonResponse({'status': 'success', 'reports': reports_list})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': 'Неверный метод запроса'}))


def update_related_collections(report_data, year):
    """Обновление связанных коллекций (замечания, утечки, КСС)"""
    department = report_data['department']
    now = datetime.now()

    # Обработка утечек
    if 'leak' in report_data['data']:
        leak_total = report_data['data']['leak'].get('leak_total', 0)
        leak_done = report_data['data']['leak'].get('leak_done', 0)
        leaks.update_one(
            {'year': year, 'department': department},
            {
                '$inc': {'total': leak_total, 'done': leak_done},
                '$setOnInsert': {'datetime': now}
            },
            upsert=True
        )

    # Обработка КСС
    if 'kss' in report_data['data']:
        kss_done = report_data['data']['kss'].get('kss_done', 0)
        if kss_done > 0:
            kss.update_one(
                {'year': year},
                {
                    '$inc': {'total': kss_done},
                    '$setOnInsert': {'datetime': now}
                },
                upsert=True
            )

    # Обработка замечаний (ОЗП, Газнадзор, Ростехнадзор)
    for remark_type in ['ozp', 'gaz', 'ros', 'apk4']:
        if remark_type in report_data['data']:
            remark_done = report_data['data'][remark_type].get(f'{remark_type}_done', 0)
            if remark_done > 0:
                # Проверяем, есть ли запись для текущего года
                existing_remark = remarks.find_one({
                    'year': year,
                    'value': remark_type,
                    'department': department
                })
                if existing_remark:
                    # Обновляем существующую запись
                    remarks.update_one(
                        {'year': year, 'value': remark_type, 'department': department},
                        {
                            '$inc': {'done': remark_done},
                            '$setOnInsert': {'datetime': now}
                        },
                        upsert=True
                    )


@csrf_exempt
def handle_planning(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            department = data.get('service')
            year = int(data.get('year'))
            now = datetime.now()

            # Обработка замечаний (ОЗП, Газнадзор, Ростехнадзор)
            for remark_type in ['ozp', 'gaz', 'ros', 'apk4']:
                total = data.get(f'{remark_type}_total', 0)
                if total:
                    remark_data = {
                        'department': department,
                        'year': year,
                        'datetime': now,
                        'value': remark_type,
                        'total': int(total),
                        'done': 0  # Начальное значение выполненных
                    }
                    remarks.replace_one(
                        {'department': department, 'year': year, 'value': remark_type},
                        remark_data,
                        upsert=True
                    )

            # Обработка планов (РП, ПАТ, ТУ)
            for plan_type in ['rp', 'pat', 'tu']:
                total = data.get(f'{plan_type}_total', 0)
                if total:
                    quarters = {
                        '1': int(data.get(f'{plan_type}_q1', 0)),
                        '2': int(data.get(f'{plan_type}_q2', 0)),
                        '3': int(data.get(f'{plan_type}_q3', 0)),
                        '4': int(data.get(f'{plan_type}_q4', 0))
                    }

                    plan_data = {
                        'department': department,
                        'datetime': now,
                        'year': year,
                        'value': plan_type,
                        'total': int(total),
                        'quarters': quarters
                    }
                    plans.replace_one(
                        {'department': department, 'year': year, 'value': plan_type},
                        plan_data,
                        upsert=True
                    )
            return JsonResponse({'status': 'success', 'message': 'Данные планирования успешно сохранены'})
        except Exception as e:
            return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': str(e)}))
    return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': 'Неверный метод запроса'}))


def get_reports(request):
    """Получение отчетов для отображения"""
    service = request.GET.get('service')
    if not service:
        return JsonResponse({'status': 'error', 'message': 'Не указана служба'}, status=400)

    try:
        # Получаем последний ежедневный отчет
        daily_report = reports.find_one(
            {'department': service, 'type': 'daily'},
            {'_id': 0, 'data': 1, 'datetime': 1, 'type': 1},
            sort=[('datetime', -1)]
        )

        # Получаем последний еженедельный отчет
        weekly_report = reports.find_one(
            {'department': service, 'type': 'weekly'},
            {'_id': 0, 'data': 1, 'datetime': 1, 'type': 1},
            sort=[('datetime', -1)]
        )

        reports_list = []
        if daily_report:
            daily_report['datetime'] = daily_report['datetime'].isoformat()
            reports_list.append(daily_report)
        if weekly_report:
            weekly_report['datetime'] = weekly_report['datetime'].isoformat()
            reports_list.append(weekly_report)

        return JsonResponse({'status': 'success', 'reports': reports_list})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def index(request):
    return render(request, 'report_webapp/index.html')


def view_data(request):
    """Страница просмотра данных"""
    services = [
        'КС-1,4', 'КС-2,3', 'КС-5,6', 'КС-7,8', 'КС-9,10',
        'АиМО', 'ЭВС', 'ЛЭС', 'СЗК', 'Связь', 'ВПО'
    ]
    return render(request, 'report_webapp/index.html', {'services': services})


@csrf_exempt
def get_leaks(request):
    department = request.GET.get('department')
    year = request.GET.get('year')

    try:
        leaks_data = leaks.find_one(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'total': 1, 'done': 1}
        )
        return JsonResponse({'status': 'success', 'total': leaks_data.get('total', 0), 'done': leaks_data.get('done', 0)})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def get_kss(request):
    year = request.GET.get('year')

    try:
        kss_data = kss.find_one(
            {'year': int(year)},
            {'_id': 0, 'total': 1}
        )
        return JsonResponse({'status': 'success', 'total': kss_data.get('total', 0)})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def get_remarks(request):
    department = request.GET.get('department')
    year = request.GET.get('year')

    try:
        remarks_list = list(remarks.find(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'value': 1, 'total': 1, 'done': 1}
        ))
        return JsonResponse({
            'status': 'success',
            'remarks': remarks_list  # Теперь возвращаем массив в поле remarks
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@csrf_exempt
def get_plans(request):
    try:
        department = request.GET.get('department')
        year = request.GET.get('year')

        plans_list = list(plans.find(
            {'department': department, 'year': int(year)},
            {'_id': 0, 'value': 1, 'total': 1, 'quarters': 1}
        ))

        return JsonResponse({
            'status': 'success',
            'plans': plans_list,
            'message': 'Plans data loaded successfully'
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'plans': []
        }, status=500)


@csrf_exempt
def handle_protocols(request):
    if request.method == 'GET':
        try:
            # Получаем только неархивированные протоколы
            queryset = list(protocols.find(
                {'archived': {'$ne': True}},
                {'_id': 1, 'date': 1, 'text': 1, 'archived': 1, 'done': 1}
            ).sort('date', 1))

            # Преобразуем ObjectId в строку и форматируем даты
            formatted_protocols = []
            for protocol in queryset:
                formatted = {
                    '_id': str(protocol['_id']),
                    'date': protocol['date'].isoformat(),
                    'text': protocol['text'],
                    'done': {}
                }

                # Форматируем информацию о выполнении
                if 'done' in protocol:
                    for dept, date in protocol['done'].items():
                        if isinstance(date, datetime):
                            formatted['done'][dept] = date.isoformat()
                        else:
                            # Если дата уже в строковом формате (на всякий случай)
                            formatted['done'][dept] = date

                formatted_protocols.append(formatted)

            return JsonResponse({
                'status': 'success',
                'protocols': formatted_protocols
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            protocol_data = {
                'date': datetime.fromisoformat(data['date']),
                'text': data['text'],
                'archived': False,
                'created_at': datetime.now()
            }

            result = protocols.insert_one(protocol_data)
            return JsonResponse({
                'status': 'success',
                'message': 'Протокол успешно добавлен',
                'id': str(result.inserted_id)
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': 'Неверный метод запроса'}))

@csrf_exempt
def archive_protocol(request, protocol_id):
    print(protocols.find_one({'_id': ObjectId(protocol_id)}))
    if request.method == 'POST':
        try:
            result = protocols.update_one(
                {'_id': ObjectId(protocol_id)},
                {'$set': {'archived': True, 'archived_at': datetime.now()}}
            )

            if result.modified_count == 1:
                return JsonResponse({'status': 'success', 'message': 'Протокол архивирован'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Протокол не найден'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': 'Неверный метод запроса'}))


@csrf_exempt
def mark_protocol_done(request, protocol_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            service = data.get('service')
            done_date = datetime.fromisoformat(data.get('done_date'))

            result = protocols.update_one(
                {'_id': ObjectId(protocol_id)},
                {'$set': {f'done.{service}': done_date}}
            )

            if result.modified_count == 1:
                return JsonResponse({'status': 'success', 'message': 'Протокол обновлен'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Протокол не найден'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return HttpResponseBadRequest(json.dumps({'status': 'error', 'message': 'Неверный метод запроса'}))
