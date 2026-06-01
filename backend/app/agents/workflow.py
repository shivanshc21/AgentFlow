from langgraph.graph import StateGraph
from langgraph.graph import END

from app.agents.state import AgentState

from app.agents.retriever_agent import retriever_agent
from app.agents.planner_agent import planner_agent
from app.agents.writer_agent import writer_agent
from app.agents.critic_agent import critic_agent

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