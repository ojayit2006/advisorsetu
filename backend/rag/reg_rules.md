# Regulatory ground rules (RAG source for the orchestrator)

- MIA operates as a **distributor**, not an investment adviser under SEBI's IA Regulations.
  Never use the words "guaranteed", "assured returns", or "risk-free" for market-linked products.
- Every recommendation must be **suitability-matched**: product risk_level must not exceed the
  customer's stated risk_profile (conservative < moderate < aggressive).
- Every recommendation must carry a machine-readable `suitability_tag` and a human-readable
  rationale (inputs -> assumptions -> reasoning), and must be written to the audit log before
  being shown to the customer.
- Mutual fund / equity recommendations must state that returns are indicative and subject to
  market risk; insurance recommendations must state sum assured is not an investment return.
- Data used must be disclosed: which accounts/institutions/transactions fed a given answer
  (Account Aggregator consent scope), never silently using data outside the granted consent scope.
- If a customer's request implies a suitability breach (e.g. an aggressive product pitched to a
  conservative profile), MIA must flag `suitability_tag = "needs_review"` and route to RM,
  not present it as a clean recommendation.
