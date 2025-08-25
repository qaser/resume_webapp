from pymongo import MongoClient
from django.conf import settings

client = MongoClient(settings.MONGO_URI)

db = client['report_webapp']
db_poks = client['poks_bot_db']

gpa = db_poks['gpa']
paths = db_poks['paths']
reqs = db_poks['requests']

reports = db['reports']
plans = db['plans']
kss = db['kss']
remarks = db['remarks']
leaks = db['leaks']
protocols = db['protocols']
orders = db['orders']
users = db['users']
faults = db['faults']
reliability = db['reliability']


def authenticate_user(department, password):
    user = users.find_one({'department': department})
    if user and user.get('password') == password:
        return user
    return None


'''
структура для faults:
{
    '_id': порядковый номер,
    'department': наименование службы,
    'type': ['Газнадзор', 'Ростехнадзор']
    'text': описание замечания,
    'date': datetime - дата до которой замечание нужно устранить,
    'is_done': false/true,
    'date_done': datetime - дата устранения замечания
    'archived': True/False
    'archived_at': datetime
    'created_at': datetime
}

структура для users:
{
    '_id': порядковый номер,
    'department': наименование службы,
    'is_admin': True/False
    'password': пароль для входа,
}


структура данных orders:
{
    '_id': порядковый номер,
    'created_at': datetime,
    'num': номер распоряжения или приказа (текст),
    'date': требуемая дата исполнения,
    'text': содержание распоряжения,
    'done': {'КС-1,4': дата_выполнения},
    'archived': True/False
    'archived_at': datetime
}

структура данных protocol:
{
    '_id': порядковый номер,
    'created_at': datetime,
    'date': требуемая дата исполнения,
    'text': текст мероприятия,
    'departments': [список подразделений (служб) для выполнения протокола совещания]
    'done': {'КС-1,4': дата_выполнения},
    'archived': True/False
    'archived_at': datetime
}

структура данных remarks:
{
    '_id': порядковый номер,
    'year': год учёта,
    'department': наименование службы,
    'datetime': дата внесения изменений,
    'value': одно из трёх значений (ozp, gaz, ros),
    'total': всего выявлено замечаний (целое число),
    'done': устранено (накопление данных о выполненых замечаниях (целое число))
}

структура данных kss: (для хранения данных о сварных соединениях)
{
    '_id': порядковый номер,
    'year': год учёта,
    'datetime': дата внесения изменений,
    'total': накопление числа выполненых стыков (целое число),
}

структура данных leaks: (для хранения данных об утечках)
{
    '_id': порядковый номер,
    'year': год учёта,
    'department': наименование службы,
    'datetime': дата внесения изменений,
    'total': накопление числа выполненых утечек (целое число),
    'done': устранено (накопление данных об устраненных утечках (целое число))
}

структура данных plans:
{
    '_id': порядковый номер,
    'department': наименование службы,
    'datetime': дата внесения изменений,
    'year': год планирования (целое число),
    'value': одно из трёх значений (rp, pat, tu),
    'total': всего запланировано на год,
    'quarters': {
        '1': количество (целое число),
        '2': количество (целое число),
        '3': количество (целое число),
        '4': количество (целое число),
    },
}

структура данных reports:
{
    '_id': порядковый номер,
    'department': наименование службы,
    'type': 'daily' или 'weekly',
    'datetime': дата ввода данных (уникальное сочетание department и datetime если type='daily', т.е. один отчет от службы в день)
    'data': {  # зависит от type, но полные данные выглядят так:
        'tasks': задачи на день (текст),
        'faults': замечания по оборудованию (текст),
        'apk': {
            'apk_total': всего замечаний АПК 1-го уровня (целое число),
            'apk_done': устраненные замечания АПК 1-го уровня (целое число),
            'apk_undone': не устраненные замечания АПК 1-го уровня (целое число),
            'apk_reason_undone': причины неустранения (текст),
        },
        'apk2': {
            'apk2_total': всего замечаний АПК 2-го уровня (целое число),
            'apk2_done': устраненные замечания АПК 2-го уровня (целое число),
            'apk2_undone': не устраненные замечания АПК 2-го уровня (целое число),
            'apk2_reason_undone': причины неустранения (текст),
        },
        'leak': {
            'leak_total': всего обнаружено утечек (целое число),
            'leak_done': всего устранено утечек (целое число),
        },
        'ozp': {
            'ozp_done': устраненные замечания ОЗП (целое число),
            'ozp_undone': не устраненные замечания ОЗП (целое число),
            'ozp_reason_undone': причины неустранения (текст),
        },
        'gaz': {
            'gaz_done': устраненные замечания Газнадзора (целое число),
            'gaz_undone': не устраненные замечания Газнадзора (целое число),
            'gaz_reason_undone': причины неустранения (текст),
        },
        'ros': {
            'ros_done': устраненные замечания Ростехнадзора (целое число),
            'ros_undone': не устраненные замечания Ростехнадзора (целое число),
            'ros_reason_undone': причины неустранения (текст),
        },
        'rp': {
            'rp_done': подано РП (целое число),
            'rp_inwork': в работе РП (целое число),
        },
        'pat': {
            'pat_done': проведено ПАТ (целое число),
        },
        'tu': {
            'tu_done': проведено ТУ (целое число),
        },
        'kss': {
            'kss_done': количество КСС выполнено,
        },
    },
}
'''
