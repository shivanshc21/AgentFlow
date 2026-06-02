from sqlalchemy import text
from app.db.database import engine

def save_document(filename):

    query = text("""
        INSERT INTO documents (
            filename,
            status
        )
        VALUES (
            :filename,
            'processing'
        )
    """)

    with engine.connect() as conn:

        conn.execute(
            query,
            {
                "filename": filename
            }
        )

        conn.commit()