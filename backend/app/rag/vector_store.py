from sqlalchemy import text

from app.db.database import engine

def store_chunk(content, embedding):

    embedding_str = "[" + ",".join(map(str, embedding)) + "]"

    query = text("""
        INSERT INTO document_chunks (content, embedding)
        VALUES (:content, :embedding)
    """)

    with engine.connect() as conn:

        conn.execute(
            query,
            {
                "content": content,
                "embedding": embedding_str
            }
        )

        conn.commit()


def store_chunks(chunks):

    for chunk in chunks:

        store_chunk(
            chunk["content"],
            chunk["embedding"]
        )