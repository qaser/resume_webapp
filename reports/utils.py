import random
import string
from pymongo import MongoClient
from django.conf import settings


def generate_password(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

def insert_users():
    client = MongoClient("mongodb://localhost:27017/")
    db = client['report_webapp']
    users_collection = db['users']

    departments = [
        "КС-1,4", "КС-2,3", "КС-5,6", "КС-7,8", "КС-9,10",
        "АиМО", "ЭВС", "ЛЭС", "СЗК", "Связь", "ВПО", "Админ"
    ]

    users_data = []
    for idx, department in enumerate(departments, start=1):
        user = {
            '_id': idx,
            'department': department,
            'is_admin': False,
            'password': generate_password()
        }
        users_data.append(user)

    users_collection.insert_many(users_data)
    print("Пользователи успешно добавлены.")

# Вызов функции:
insert_users()


def get_user_passwords_sms_text():
    client = MongoClient("mongodb://localhost:27017/")
    db = client['report_webapp']
    users_collection = db['users']

    users = users_collection.find({}, {'_id': 0, 'department': 1, 'password': 1})
    lines = [f"{user['department']} - {user['password']}" for user in users]

    sms_text = '\n'.join(lines)
    return sms_text

# Пример использования:
sms_text = get_user_passwords_sms_text()
print(sms_text)
