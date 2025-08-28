#!/usr/bin/env python3
"""
Скрипт миграции данных распоряжений из старой структуры в новую
"""

import sys
import os
import json
from datetime import datetime
from bson import ObjectId

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'report_webapp.settings')

import django
django.setup()

from pymongo import MongoClient
from django.conf import settings

class CustomJSONEncoder(json.JSONEncoder):
    """Кастомный JSON encoder для обработки datetime и ObjectId"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def backup_orders(orders_collection, backup_file):
    """Создание бэкапа распоряжений"""
    print("Создаем бэкап распоряжений...")

    orders = list(orders_collection.find({}))

    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(orders, f, ensure_ascii=False, indent=2, cls=CustomJSONEncoder)

    print(f"Бэкап сохранен в: {backup_file}")

def migrate_orders():
    """Миграция данных распоряжений"""

    client = MongoClient(settings.MONGO_URI)
    db = client['report_webapp']
    orders_collection = db['orders']

    # Создаем бэкап
    backup_file = f'orders_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    backup_orders(orders_collection, backup_file)

    print("Начинаем миграцию распоряжений...")

    # Находим распоряжения для миграции (без issue_date или с полем date вместо deadline)
    old_orders = list(orders_collection.find({
        '$or': [
            {'issue_date': {'$exists': False}},
            {'deadline': {'$exists': False}}
        ]
    }))

    print(f"Найдено распоряжений для миграции: {len(old_orders)}")

    migrated_count = 0
    error_count = 0

    for order in old_orders:
        try:
            # Определяем данные для обновления
            update_data = {}

            # # Если есть старое поле date, используем его для issue_date
            # if 'date' in order and isinstance(order['date'], datetime):
            #     update_data['issue_date'] = order['date']

            # Если нет поля num, устанавливаем "б/н"
            if 'num' not in order or not order['num']:
                update_data['num'] = 'б/н'

            # Преобразуем старое поле date в текстовый deadline
            deadline_text = ''
            if 'date' in order and isinstance(order['date'], datetime):
                deadline_text = order['date'].strftime('%d.%m.%Y')
            update_data['deadline'] = deadline_text

            # Обновляем документ
            result = orders_collection.update_one(
                {'_id': order['_id']},
                {'$set': update_data}
            )

            if result.modified_count == 1:
                migrated_count += 1
                print(f"✓ Мигрировано распоряжение: {order['_id']}")
            else:
                error_count += 1
                print(f"✗ Не удалось мигрировать распоряжение: {order['_id']}")

        except Exception as e:
            error_count += 1
            print(f"✗ Ошибка при миграции распоряжения {order['_id']}: {str(e)}")

    print(f"\nМиграция завершена!")
    print(f"Успешно мигрировано: {migrated_count}")
    print(f"С ошибками: {error_count}")

    # Проверяем результаты
    total_new_structure = orders_collection.count_documents({
        'issue_date': {'$exists': True},
        'deadline': {'$exists': True}
    })

    total_old_structure = orders_collection.count_documents({
        '$or': [
            {'issue_date': {'$exists': False}},
            {'deadline': {'$exists': False}}
        ]
    })

    print(f"\nСтатистика после миграции:")
    print(f"Распоряжений с новой структурой: {total_new_structure}")
    print(f"Распоряжений со старой структурой: {total_old_structure}")

def verify_migration():
    """Проверка результатов миграции"""

    client = MongoClient(settings.MONGO_URI)
    db = client['report_webapp']
    orders_collection = db['orders']

    print("\nПроверка результатов миграции:")
    print("=" * 40)

    # Проверяем несколько документов после миграции
    migrated_orders = list(orders_collection.find({
        'issue_date': {'$exists': True},
        'deadline': {'$exists': True}
    }).limit(5))

    print("Примеры мигрированных распоряжений:")
    for i, order in enumerate(migrated_orders, 1):
        print(f"{i}. ID: {order['_id']}")
        print(f"   Номер: {order.get('num', 'N/A')}")
        print(f"   Дата выхода: {order.get('issue_date', 'N/A')}")
        print(f"   Срок исполнения: {order.get('deadline', 'N/A')}")
        print(f"   Текст: {order.get('text', 'N/A')[:50]}...")
        print()

if __name__ == '__main__':
    print("=" * 60)
    print("МИГРАЦИЯ РАСПОРЯЖЕНИЙ (ПРИКАЗОВ)")
    print("=" * 60)
    print("Этот скрипт:")
    print("1. Создаст бэкап текущих данных распоряжений")
    print("2. Добавит поле issue_date (дата распоряжения)")
    print("3. Установит num = 'б/н' для распоряжений без номера")
    print("4. Преобразует поле date в deadline (текстовый формат 'дд.мм.гггг')")
    print("=" * 60)

    confirm = input("Продолжить? (y/N): ")

    if confirm.lower() == 'y':
        migrate_orders()
        verify_migration()
    else:
        print("Миграция отменена.")
