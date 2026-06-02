from app.llm.gemini_client import generate_stream

def stream_response(query, contexts):

    context_text = "\n\n".join(contexts)

    prompt = f"""
Context:
{context_text}

Question:
{query}

Answer briefly.
"""

    try:
        for chunk in generate_stream(prompt):
            yield chunk
    except Exception as e:
        yield f"Error generating response: {str(e)}"