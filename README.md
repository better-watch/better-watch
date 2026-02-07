# Better Watch

Better Watch is an intelligent observability and analytics agent that automatically detects, diagnoses, and patches production issues in real-time and runtime. By combining continuous monitoring with AI-powered code analysis and runtime patching capabilities, Better Watch dramatically reduces mean time to resolution (MTTR) while maintaining safety through human oversight.


# How it works

Better Watch automatically detects bugs, generates patches, and deploys them as toggleable fixes that can be enabled/disabled in real-time, similar to how feature flags work. Once a patch is live and validated, Better Watch creates a PR with the permanent fix. When the PR is merged, the runtime patch is automatically decommissioned, completing the bug-fix lifecycle.


## Structure

```
├── agent/      # Backend agent service
├── sdk/        # Better Watch SDK
└── app/        # Next.js web application
```

## Getting Started

### Web Application

Navigate to the app directory and run the development server:

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Agent Service

Navigate to the agent directory:

```bash
cd agent
npm install
npm start
```

### SDK

Navigate to the sdk directory:

```bash
cd sdk
npm install
npm run build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- Check out the individual package READMEs for more information.
