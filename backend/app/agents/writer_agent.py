import ollama

def writer_agent(state):

    prompt = f"""
Context:
{state['context']}

Plan:
{state['plan']}

Question:
{state['query']}

Write final answer.
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

    state["answer"] = response["message"]["content"]

    return state