# Factory project contract

This repository is a Turkish, read-only factory status dashboard. Modify only the files assigned by your role. No deployment, remote push, new credentials, home-directory reads or package installation. The worker performs commands and delivery separately.

- Test author owns tests/. Coder owns app/. Reviewer is read-only.
- Never change acceptance tests, this file, .github/, Dockerfile or dependency manifests to make a failing implementation pass.
- Use the existing .venv/bin/python and installed packages.
- Use small domain/application/API modules with explicit dependencies; OOP/SOLID where they clarify behavior. Do not add an unnecessary framework or service.
- No LLM call, external request, filesystem browsing or shell execution from the product.
- Frontend uses local DaisyUI CSS, semantic HTML, Turkish labels, keyboard-accessible controls and textContent for untrusted values.
- No nested agent spawning. Final response is short and reports real tests and remaining limitations.

