import ollama

def planner_agent(state):

    query = state["query"]

    prompt = f"""
Break this task into reasoning steps.

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

    state["plan"] = response["message"]["content"]

    return state