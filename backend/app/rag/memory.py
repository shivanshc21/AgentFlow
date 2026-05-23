from sqlalchemy import text

from backend.app.db.database import engine

def save_message(session_id, role, message):

    query = text("""
        INSERT INTO chat_memory (
            session_id,
            role,
            message
        )
        VALUES (
            :session_id,
            :role,
            :message
        )
    """)

    with engine.connect() as conn:

        conn.execute(
            query,
            {
                "session_id": session_id,
                "role": role,
                "message": message
            }
        )

        conn.commit()

def get_memory(session_id):

    query = text("""
        SELECT role, message
        FROM chat_memory
        WHERE session_id = :session_id
        ORDER BY id ASC
        LIMIT 10
    """)

    with engine.connect() as conn:

        results = conn.execute(
            query,
            {
                "session_id": session_id
            }
        )

        rows = results.fetchall()

    return rows