from app.llm.gemini_client import generate

def critic_agent(state):

    prompt = f"""
Check whether this answer contains hallucinations.

Context:
{state['context']}

Answer:
{state['answer']}

Critique briefly.
"""

    try:
        state["critique"] = generate(prompt)
    except Exception as e:
        state["critique"] = f"Error generating critique: {str(e)}"

    return state