from datetime import datetime
from django.http import JsonResponse
from rest_framework.decorators import api_view
import pytz
from report_webapp.utils import reqs


def get_today():
    now = datetime.now(pytz.UTC)
    return now.strftime('%Y-%m-%d')


@api_view(['GET'])
def get_requests(request):
    today_str = get_today()

    # 1. Pending — на согласовании
    pending_filter = {'status': 'inwork', 'req_type': 'with_approval'}
    pending = list(reqs.find(pending_filter, {'_id': 0, 'gpa_id': 0, 'path_id': 0, 'files': 0}).sort('request_datetime', 1))

    # 2. Approved — согласованы на сегодня, но не завершены
    approved_filter = {
        '$expr': {
            '$eq': [
                {'$dateToString': {'format': '%Y-%m-%d', 'date': '$request_datetime'}},
                today_str
            ]
        },
        'status': 'approved',
        'is_complete': False
    }
    approved = list(reqs.find(approved_filter, {'_id': 0, 'gpa_id': 0, 'path_id': 0, 'files': 0}).sort('request_datetime', 1))

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
    completed = list(reqs.find(completed_filter, {'_id': 0, 'gpa_id': 0, 'path_id': 0, 'files': 0}).sort('request_datetime', 1))
    print(pending)

    return JsonResponse({
        'pending': pending,
        'approved': approved,
        'completed': completed
    }, safe=False)
