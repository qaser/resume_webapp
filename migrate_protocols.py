#!/usr/bin/env python3
"""
Скрипт миграции данных протоколов из старой структуры в новую
"""

import sys
import os

# Добавляем путь к Django проекту
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'report_webapp.settings')

import django
django.setup()

from pymongo import MongoClient
from django.conf import settings
from datetime import datetime

def migrate_protocols():
    """Миграция данных протоколов из старой структуры в новую"""

    # Подключаемся к MongoDB
    client = MongoClient(settings.MONGO_URI)
    db = client['report_webapp']
    protocols_collection = db['protocols']

    print("Начинаем миграцию протоколов...")

    # Находим все протоколы со старой структурой (без protocol_num)
    old_protocols = list(protocols_collection.find({
        'protocol_num': {'$exists': False}
    }))

    print(f"Найдено протоколов для миграции: {len(old_protocols)}")

    migrated_count = 0
    skipped_count = 0

    for protocol in old_protocols:
        try:
            # Создаем обновленные данные
            update_data = {
                # 'issue_date': protocol.get('date', datetime.now()),
                'protocol_num': 'б/н',  # Ставим "б/н" если номера нет
                'protocol_name': 'Протокол совещания',  # Стандартное название
                'deadline': protocol.get('date').strftime('%d.%m.%Y') if protocol.get('date') else '',  # Преобразуем date в текст
            }

            # Обновляем документ
            result = protocols_collection.update_one(
                {'_id': protocol['_id']},
                {'$set': update_data}
            )

            if result.modified_count == 1:
                migrated_count += 1
                print(f"Мигрирован протокол: {protocol['_id']}")
            else:
                skipped_count += 1
                print(f"Не удалось мигрировать протокол: {protocol['_id']}")

        except Exception as e:
            skipped_count += 1
            print(f"Ошибка при миграции протокола {protocol['_id']}: {str(e)}")

    print(f"\nМиграция завершена!")
    print(f"Успешно мигрировано: {migrated_count}")
    print(f"Пропущено: {skipped_count}")

    # Проверяем результаты
    total_new_structure = protocols_collection.count_documents({
        'protocol_num': {'$exists': True}
    })
    total_old_structure = protocols_collection.count_documents({
        'protocol_num': {'$exists': False}
    })

    print(f"\nСтатистика после миграции:")
    print(f"Протоколов с новой структурой: {total_new_structure}")
    print(f"Протоколов со старой структурой: {total_old_structure}")

if __name__ == '__main__':
    # Запрашиваем подтверждение
    confirm = input("Вы уверены, что хотите выполнить миграцию протоколов? (y/N): ")

    if confirm.lower() == 'y':
        migrate_protocols()
    else:
        print("Миграция отменена.")
