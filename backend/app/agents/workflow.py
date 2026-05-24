from langgraph.graph import StateGraph
from langgraph.graph import END

from backend.app.agents.state import AgentState

from backend.app.agents.retriever_agent import retriever_agent
from backend.app.agents.planner_agent import planner_agent
from backend.app.agents.writer_agent import writer_agent
from backend.app.agents.critic_agent import critic_agent

workflow = StateGraph(AgentState)

workflow.add_node(
    "retriever",
    retriever_agent
)

workflow.add_node(
    "planner",
    planner_agent
)

workflow.add_node(
    "writer",
    writer_agent
)

workflow.add_node(
    "critic",
    critic_agent
)

workflow.set_entry_point("retriever")

workflow.add_edge(
    "retriever",
    "planner"
)

workflow.add_edge(
    "planner",
    "writer"
)

workflow.add_edge(
    "writer",
    "critic"
)

workflow.add_edge(
    "critic",
    END
)

graph = workflow.compile()