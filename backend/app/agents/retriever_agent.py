from app.rag.retriever import retrieve_chunks

def retriever_agent(state):

    query = state["query"]

    results = retrieve_chunks(query)

    contexts = [row[0] for row in results]

    combined_context = "\n\n".join(contexts)

    state["context"] = combined_context

    return state