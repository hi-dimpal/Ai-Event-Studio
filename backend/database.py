import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "events.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            venue TEXT NOT NULL,
            target_audience TEXT NOT NULL,
            theme TEXT NOT NULL,
            objectives TEXT NOT NULL,
            registration_link TEXT NOT NULL,
            speakers TEXT,
            activities TEXT,
            important_instructions TEXT,
            generated_package TEXT,
            poster_reference TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def create_event(event_data, generated_package, poster_reference=None):
    conn = get_db()
    cursor = conn.cursor()
    
    package_json = json.dumps(generated_package) if generated_package else None

    cursor.execute('''
        INSERT INTO events (
            event_name, event_type, date, time, venue, target_audience,
            theme, objectives, registration_link, speakers, activities,
            important_instructions, generated_package, poster_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        event_data.get('event_name'), event_data.get('event_type'),
        event_data.get('date'), event_data.get('time'), event_data.get('venue'),
        event_data.get('target_audience'), event_data.get('theme'),
        event_data.get('objectives'), event_data.get('registration_link'),
        event_data.get('speakers'), event_data.get('activities'),
        event_data.get('important_instructions'), package_json, poster_reference
    ))
    event_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_event(event_id)

def get_events():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM events ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    events_list = []
    for row in rows:
        event = dict(row)
        if event['generated_package']:
            try:
                event['generated_package'] = json.loads(event['generated_package'])
            except:
                event['generated_package'] = None
        events_list.append(event)
    return events_list

def get_event(event_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM events WHERE id = ?', (event_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        event = dict(row)
        if event['generated_package']:
            try:
                event['generated_package'] = json.loads(event['generated_package'])
            except:
                event['generated_package'] = None
        return event
    return None

def update_event(event_id, event_data, generated_package, poster_reference=None):
    conn = get_db()
    cursor = conn.cursor()
    
    package_json = json.dumps(generated_package) if generated_package else None

    cursor.execute('''
        UPDATE events SET
            event_name = ?, event_type = ?, date = ?, time = ?, venue = ?,
            target_audience = ?, theme = ?, objectives = ?, registration_link = ?,
            speakers = ?, activities = ?, important_instructions = ?,
            generated_package = ?, poster_reference = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        event_data.get('event_name'), event_data.get('event_type'),
        event_data.get('date'), event_data.get('time'), event_data.get('venue'),
        event_data.get('target_audience'), event_data.get('theme'),
        event_data.get('objectives'), event_data.get('registration_link'),
        event_data.get('speakers'), event_data.get('activities'),
        event_data.get('important_instructions'), package_json, poster_reference,
        event_id
    ))
    conn.commit()
    conn.close()
    return get_event(event_id)

def delete_event(event_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
    conn.commit()
    conn.close()
