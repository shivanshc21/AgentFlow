import ollama

def generate_response(query, contexts):

    context_text = "\n\n".join(contexts)

    prompt = f"""
Answer ONLY using the provided context.

Context:
{context_text}

Question:
{query}
"""

    response = ollama.chat(
        model="llama3",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]