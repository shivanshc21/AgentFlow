from sqlalchemy import text

from backend.app.db.database import engine
from backend.app.rag.embeddings import generate_embedding

def retrieve_chunks(query, limit=5):

    query_embedding = generate_embedding(query)

    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    sql = text("""
        SELECT content,
               embedding <-> CAST(:embedding AS vector) AS distance
        FROM document_chunks
        ORDER BY embedding <-> CAST(:embedding AS vector)
        LIMIT :limit
    """)

    with engine.connect() as conn:

        results = conn.execute(
            sql,
            {
                "embedding": embedding_str,
                "limit": limit
            }
        )

        rows = results.fetchall()

    return rows