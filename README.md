# Inkling

> ⚡ This app is partially **vibecoded**

A personal note-taking application with AI-powered features, built with Next.js and designed with a mobile-first approach.

## Features

- **Smart Markdown Conversion**: Automatically converts any text input into beautifully formatted Markdown for enhanced readability
- **Mobile-First Interface**: Optimized user experience designed specifically for mobile devices
- **AI-Powered Chat**: Each note comes with its own personal chatbot powered by Google's Gemini AI, allowing you to ask questions about your notes and get instant answers
- **Rich Text Rendering**: Full support for mathematical equations (via KaTeX), GitHub Flavored Markdown, and more
- **Secure Authentication**: Built-in user authentication with JWT tokens and bcrypt password hashing
- **Offline Support**: IndexedDB integration for local data persistence
- **Real-time Note Management**: Create, edit, and organize your notes seamlessly

## Tech Stack

- **Framework**: Next.js 
- **Database**: MongoDB
- **AI**: Google Generative AI (Gemini)
- **Markdown**: react-markdown with plugins for GFM, math rendering, and syntax highlighting

## Prerequisites

- Node.js >= 20.0.0
- MongoDB database
- Google Gemini API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
PUBLIC_BASE_URL=http://localhost:3000
ALLOW_REGISTRATION=true
```

### Environment Variable Descriptions

- `MONGODB_URI`: Your MongoDB connection string
- `MONGODB_DB`: The name of your MongoDB database
- `GEMINI_API_KEY`: Your Google Gemini API key for AI features
- `JWT_SECRET`: Secret key for JWT token generation (use a strong random string)
- `PUBLIC_BASE_URL`: The base URL of your application
- `ALLOW_REGISTRATION`: Set to `true` to allow new user registrations, `false` to disable

## Installation

1. Clone the repository:
```bash
git clone https://github.com/taciturn2021/Inkling.git
cd Inkling
```

2. Install dependencies:
```bash
npm ci
```

3. Set up your environment variables (see above)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## Deployment

This application is configured for deployment on Coolify using Nixpacks. The production server runs on port 8476 by default.

### Coolify Deployment

The repository includes a `nixpacks.toml` configuration file that automatically sets up the deployment environment with:
- Node.js 20
- Production build optimization
- Automatic dependency installation

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Author

Created by [@taciturn2021](https://github.com/taciturn2021)

