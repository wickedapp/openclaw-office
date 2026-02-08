# Contributing to OpenClaw Office

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/wickedapp/openclaw-office
cd openclaw-office
npm install
cp .env.example .env.local
cp openclaw-office.config.example.json openclaw-office.config.json
npm run dev
```

The dev server runs on [http://localhost:4200](http://localhost:4200).

## Pull Requests

1. Fork the repo and create a feature branch from `master`
2. Make your changes with clear, descriptive commits
3. Test locally with `npm run build` to catch errors
4. Open a PR with a description of what changed and why

## Code Style

- ES Modules (`import`/`export`)
- React functional components with hooks
- Tailwind CSS for styling
- JSDoc comments on exported functions

## Reporting Issues

Open a GitHub issue with:
- What you expected vs what happened
- Steps to reproduce
- Your environment (OS, Node version, browser)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
