from app.llm.gemini_client import generate

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

    try:
        state["answer"] = generate(prompt)
    except Exception as e:
        state["answer"] = f"Error generating answer: {str(e)}"

    return state