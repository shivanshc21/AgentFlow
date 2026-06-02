from app.llm.gemini_client import generate

def planner_agent(state):

    query = state["query"]

    prompt = f"""
Break this task into reasoning steps.

Question:
{query}
"""

    try:
        state["plan"] = generate(prompt)
    except Exception as e:
        state["plan"] = f"Error generating plan: {str(e)}"

    return state