import ollama

def critic_agent(state):

    prompt = f"""
Check whether this answer contains hallucinations.

Context:
{state['context']}

Answer:
{state['answer']}

Critique briefly.
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

    state["critique"] = response["message"]["content"]

    return state