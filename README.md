# Zaroda Sports System

A comprehensive sports management system built with modern web technologies.

## Project Overview

The Zaroda Sports System is designed to manage sports competitions, participants, rankings, and various sports-related data with an intuitive admin dashboard.

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI component framework
- **shadcn-ui** - High-quality UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend-as-a-service for database and authentication
- **React Query** - Data fetching and caching
- **React Hook Form** - Efficient form handling
- **Recharts** - Data visualization

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```sh
git clone https://github.com/ChaloGuru/zaroda-sports-system.git
cd zaroda-sports-system
```

2. Install dependencies:
```sh
npm install
```

3. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Project Structure

- `src/components/` - Reusable React components
- `src/pages/` - Page components
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers
- `src/integrations/` - External service integrations (Supabase)
- `src/types/` - TypeScript type definitions
- `public/` - Static assets

## Deployment

Build the project for production:

```sh
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
