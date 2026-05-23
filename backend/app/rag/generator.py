import ollama

def stream_response(query, contexts):

    context_text = "\n\n".join(contexts)

    prompt = f"""
Context:
{context_text}

Question:
{query}

Answer briefly.
"""

    stream = ollama.chat(
        model="llama3",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        stream=True
    )

    for chunk in stream:

        yield chunk["message"]["content"]