# FocusFlow

FocusFlow is a browser prototype for ThinkTank 2026. It explores how students can use study-session records and quiz results to make more informed decisions about when and how long to study.

## Try the prototype

Use Node.js 22 or later and run:

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Try the demo profile to explore three weeks of example sessions, or start a session of your own. Run `npm run build` to generate a production bundle.

## What the prototype does

- Set a subject and task, start a timed study session, and review its activity timeline.
- Take a short subject quiz and see the result alongside the session.
- Explore patterns in recorded sessions, including stronger focus windows, typical effective session length, and focus changes during a session.
- Use the planner and insights views to review suggested study times and session lengths.
- Export or clear study data through settings.

Activity tracking is simulated in the browser. The analytics use rules and calculations over session records. The standalone entry point supplies browser-local storage for the original React component. The pitch deck describes a future architecture with desktop tracking and a backend for predictive modeling.

## Team

Ricky Maishari, Subhasish, Sowmya, and Daneeka.
