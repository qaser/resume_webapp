from datetime import datetime
from django.http import JsonResponse
from rest_framework.decorators import api_view
import pytz
from report_webapp.utils import reqs, paths


def get_today():
    now = datetime.now(pytz.UTC)
    return now.strftime('%Y-%m-%d')


from django.http import JsonResponse
from rest_framework.decorators import api_view

@api_view(['GET'])
def get_requests(request):
    today_str = get_today()

    # Получаем все path'ы как словарь: path_id -> path_type и num_stages
    all_paths = list(paths.find({}, {'_id': 1, 'path_type': 1, 'num_stages': 1}))
    path_dict = {p['_id']: {'path_type': p.get('path_type', '—'), 'num_stages': p.get('num_stages', 0)}
               for p in all_paths}

    def add_gpa_type_and_stages(data):
        for r in data:
            path_info = path_dict.get(r.get('path_id'), {})
            r['gpa_type'] = path_info.get('path_type', '—')
            r['num_stages'] = path_info.get('num_stages', 0)  # Добавляем num_stages
            r.pop('path_id', None)  # Удаляем path_id
        return data

    # 1. Pending — на согласовании
    pending_filter = {'status': 'inwork', 'req_type': 'with_approval'}
    pending = list(reqs.find(pending_filter, {'_id': 0, 'gpa_id': 0, 'files': 0}).sort('request_datetime', 1))
    pending = add_gpa_type_and_stages(pending)  # Используем новую функцию

    # 2. Approved — согласованы на сегодня, но не завершены
    approved_filter = {
        '$expr': {
            '$lte': [
                {'$dateToString': {'format': '%Y-%m-%d', 'date': '$request_datetime'}},
                today_str
            ]
        },
        'status': 'approved',
        'is_complete': False
    }
    approved = list(reqs.find(approved_filter, {'_id': 0, 'gpa_id': 0, 'files': 0}).sort('request_datetime', 1))
    approved = add_gpa_type_and_stages(approved)

    # 3. Completed — завершены на сегодня
    completed_filter = {
        '$expr': {
            '$eq': [
                {'$dateToString': {'format': '%Y-%m-%d', 'date': '$request_datetime'}},
                today_str
            ]
        },
        'status': 'approved',
        'is_complete': True
    }
    completed = list(reqs.find(completed_filter, {'_id': 0, 'gpa_id': 0, 'files': 0}).sort('request_datetime', 1))
    completed = add_gpa_type_and_stages(completed)

    return JsonResponse({
        'pending': pending,
        'approved': approved,
        'completed': completed
    }, safe=False)
