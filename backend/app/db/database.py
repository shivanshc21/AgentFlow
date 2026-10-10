import os

from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print(DATABASE_URL)

# pyrefly: ignore [bad-argument-type]
engine = create_engine(DATABASE_URL)

from sqlalchemy.orm import declarative_base
Base = declarative_base()

def init_db():
    import logging
    from sqlalchemy import text
    logger = logging.getLogger(__name__)
    try:
        with engine.connect() as conn:
            # Create pgvector extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            
            # Create documents table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'processing'
                );
            """))
            conn.commit()
            
            # Create document_chunks table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id SERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    embedding vector(384) NOT NULL
                );
            """))
            conn.commit()
            
            # Create chat_memory table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_memory (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()
            print("🎉 Database tables initialized successfully")
    except Exception as e:
        logger.error(f"⚠️ Database initialization failed: {e}")
