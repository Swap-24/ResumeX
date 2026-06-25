from langgraph.graph import StateGraph, END
from app.pipeline.state import ResumeState
from app.pipeline.nodes import fetch_job, run_evaluator, run_profiler, combine_sections, save_analysis

def build_graph():
    graph = StateGraph(ResumeState)

    graph.add_node("fetch_job", fetch_job)
    graph.add_node("run_evaluator", run_evaluator)
    graph.add_node("run_profiler", run_profiler)
    graph.add_node("combine_sections", combine_sections)
    graph.add_node("save_analysis", save_analysis)

    graph.set_entry_point("fetch_job")
    graph.add_edge("fetch_job", "run_evaluator")
    graph.add_edge("run_evaluator", "run_profiler")
    graph.add_edge("run_profiler", "combine_sections")
    graph.add_edge("combine_sections", "save_analysis")
    graph.add_edge("save_analysis", END)

    return graph.compile()

pipeline = build_graph()