from typing import TypedDict

class AgentState(TypedDict):

    query: str

    context: str

    plan: str

    answer: str

    critique: str