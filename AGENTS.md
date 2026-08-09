## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Use a Graphify-first, source-verified workflow for every future codebase task in this repository. Start with the existing graph for structure, ownership, dependencies, paths, and impact analysis; then use targeted source searches and file reads to verify exact implementation details. When the user types `/graphify`, use the installed Graphify skill or instructions before doing anything else.

Rules:
- For every codebase question, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Then verify the important findings with targeted `rg` and source reads, especially before editing code. These return a scoped starting point, usually much smaller than GRAPH_REPORT.md or broad raw search output.
- Use raw search and direct file reads for exact strings, configuration values, documentation wording, tests, generated files, dynamic behavior, and relationships marked AMBIGUOUS or absent from the graph. Do not treat Graphify as a replacement for tests or source verification.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
