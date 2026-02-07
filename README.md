# Time Machine

A monorepo containing the Time Machine application and related packages.

## Structure

```
├── agent/      # Backend agent service
├── sdk/        # Time Machine SDK
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
