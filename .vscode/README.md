# VS Code Configuration for AI Menu Generator

This directory contains VS Code configuration files to enhance the development experience for the AI Menu Generator project.

## Launch Configurations

### Available Launch Options

1. **Launch Full Stack (Development)** - Recommended for development
   - Starts both backend and frontend in development mode
   - Backend runs on port 3001 with hot reload
   - Frontend runs on port 3000 with proxy to backend
   - Both applications run simultaneously

2. **Launch Backend (Development)**
   - Runs only the backend server in development mode
   - Includes TypeScript debugging support
   - Auto-restarts on file changes

3. **Launch Frontend (Development)**
   - Runs only the frontend React application
   - Includes hot module replacement
   - Proxy configured to backend on port 3001

4. **Launch Backend (Production)**
   - Runs the compiled backend in production mode
   - Requires building the project first

5. **Debug Backend Tests**
   - Runs backend Jest tests with debugging support
   - Useful for debugging failing tests

6. **Debug Frontend Tests**
   - Runs frontend React tests with debugging support

### How to Use

1. **Quick Start (Recommended)**:
   - Press `F5` or go to Run and Debug panel
   - Select "Launch Full Stack (Development)"
   - Click the play button

2. **Individual Services**:
   - Use "Launch Backend (Development)" or "Launch Frontend (Development)"
   - Useful when you only need to work on one part

3. **Debugging**:
   - Set breakpoints in your TypeScript/JavaScript code
   - Use the debug configurations to step through code
   - Inspect variables and call stacks

## Tasks

### Available Tasks

- **setup-project**: Install dependencies and build backend
- **start-full-stack**: Start both frontend and backend in development mode
- **build-backend**: Compile TypeScript backend
- **build-frontend**: Build React frontend for production
- **test-backend**: Run backend tests
- **test-frontend**: Run frontend tests

### How to Use Tasks

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select the task you want to run

## Settings

The workspace settings include:

- **Auto-formatting** on save
- **ESLint** integration
- **TypeScript** configuration
- **File exclusions** for cleaner explorer
- **Debug console** customization

## Recommended Extensions

The configuration recommends useful extensions for:

- **TypeScript/JavaScript** development
- **React** development
- **Node.js** backend development
- **Testing** with Jest
- **Code quality** with ESLint and Prettier
- **Git** integration
- **REST API** testing

## Debugging Tips

### Backend Debugging

1. Set breakpoints in `.ts` files
2. Use "Launch Backend (Development)" configuration
3. The debugger will automatically attach to the Node.js process
4. Source maps are configured for TypeScript debugging

### Frontend Debugging

1. Use browser developer tools for React debugging
2. Install React Developer Tools browser extension
3. Use "Launch Frontend (Development)" for the dev server
4. Console logs will appear in the integrated terminal

### Full Stack Debugging

1. Use "Launch Full Stack (Development)" to debug both simultaneously
2. Backend breakpoints work in VS Code
3. Frontend debugging works in browser dev tools
4. Network requests between frontend and backend can be monitored

## Environment Variables

The launch configurations set appropriate environment variables:

- `NODE_ENV=development` for development mode
- `PORT=3001` for backend server
- `FRONTEND_URL=http://localhost:3000` for CORS configuration

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Make sure no other applications are using ports 3000 or 3001
   - Kill existing processes: `lsof -ti:3000 | xargs kill -9`

2. **TypeScript compilation errors**:
   - Run "build-backend" task to see detailed errors
   - Check `tsconfig.json` configuration

3. **Dependencies not installed**:
   - Run "setup-project" task to install all dependencies

4. **Proxy not working**:
   - Ensure backend is running on port 3001
   - Check `frontend/package.json` proxy configuration

### Getting Help

- Check the integrated terminal for error messages
- Use the Problems panel to see TypeScript/ESLint issues
- Consult the main project README.md for setup instructions