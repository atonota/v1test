# Factory project contract

This repository is a Turkish factory status dashboard. This file is an adapter to the controller's versioned owner decision, not an independent policy authority. The latest scoped owner instruction supersedes conflicting older project guidance. Modify only the files assigned by your role. The worker performs delivery separately.

- Test author owns tests/. Coder owns app/ and frontend/. Reviewer is read-only.
- Test-author may reconcile an obsolete test with an explicitly changed owner requirement; record the requirement mapping and preserve unrelated coverage. Coder cannot change tests to make its implementation pass. Independent review verifies that the latest request, not an obsolete expectation, is met.
- Controller owns this adapter, .github/, Dockerfile, dependency manifests and production delivery checks. If a required change touches those paths, report it clearly for the controller instead of repeatedly trying workarounds.
- Use the existing .venv/bin/python and installed packages.
- Use small domain/application/API modules with explicit dependencies; OOP/SOLID where they clarify behavior. Do not add an unnecessary framework or service.
- No LLM call, external request, filesystem browsing or shell execution from the product.
- Frontend uses local DaisyUI CSS, semantic HTML, Turkish labels, keyboard-accessible controls and textContent for untrusted values.
- Look up ui.catalog.json before creating components. Separate only materially different presentations; share state/domain/semantics. Production imports select the required profile, Storybook documents all variants. Run package scripts; built artifacts are not hand edited.
- No nested agent spawning. Final response is short and reports real tests and remaining limitations.
