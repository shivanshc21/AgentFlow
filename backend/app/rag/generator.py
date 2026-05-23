import ollama

def generate_response(query, contexts, memory):

    context_text = "\n\n".join(contexts)

    memory_text = ""

    for role, msg in memory:
        memory_text += f"{role}: {msg}\n"

    prompt = f"""
You are a helpful AI assistant.

Conversation History:
{memory_text}

Context:
{context_text}

Question:
{query}

Answer ONLY using context if relevant.
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