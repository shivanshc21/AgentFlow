from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

def generate_embedding(text: str):

    embedding = model.encode(text)

    # pyrefly: ignore [missing-attribute]
    return embedding.tolist()
