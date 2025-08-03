# Debugging Guide for AI Menu Generator

This guide will help you set up and troubleshoot debugging for both frontend and backend components.

## 🐛 Backend Debugging (TypeScript/Node.js)

### Method 1: VS Code Launch Configuration (Recommended)

1. **Set breakpoints** in your TypeScript files (`.ts` files in `backend/src/`)
2. **Open VS Code** in the project root
3. **Go to Run and Debug panel** (Ctrl+Shift+D)
4. **Select "Launch Backend (Development)"**
5. **Click the play button** ▶️

### Method 2: Nodemon with Inspector

1. **Start the backend in debug mode**:
   ```bash
   cd backend
   npm run debug
   ```

2. **In VS Code**:
   - Go to Run and Debug panel
   - Select "Attach to Backend Process"
   - Click the play button

### Method 3: Manual Inspector

1. **Start with inspect flag**:
   ```bash
   cd backend
   npm run debug:inspect
   ```

2. **Attach VS Code debugger** using "Attach to Backend Process" configuration

### Troubleshooting Backend Debugging

#### Issue: Breakpoints not binding (red circles with white dots)

**Solution 1: Check Source Maps**
- Ensure `tsconfig.json` has `"sourceMap": true`
- Verify the launch configuration has `"sourceMaps": true`

**Solution 2: Verify File Paths**
- Make sure you're setting breakpoints in `.ts` files, not `.js` files
- Check that the file path matches the workspace structure

**Solution 3: Restart Debug Session**
- Stop the debug session (Shift+F5)
- Restart with F5
- Set breakpoints after the debugger is attached

**Solution 4: Use Nodemon Method**
- Use "Launch Backend with Nodemon" configuration
- This provides better source map support

#### Issue: "Cannot connect to runtime process"

**Solution:**
```bash
# Kill any existing Node processes
pkill -f node

# Clear the debug port
lsof -ti:9229 | xargs kill -9

# Restart the debug session
```

#### Issue: TypeScript compilation errors

**Solution:**
```bash
cd backend
npm run build
```
Fix any TypeScript errors before debugging.

## 🎯 Setting Effective Breakpoints

### Backend Breakpoints

1. **API Route Handlers** (`backend/src/routes/*.ts`):
   ```typescript
   router.post('/upload', async (req, res) => {
     debugger; // Or set breakpoint here
     // Your code
   });
   ```

2. **Service Methods** (`backend/src/services/*.ts`):
   ```typescript
   async processMenuImage(sessionId: string) {
     debugger; // Or set breakpoint here
     // Your processing logic
   }
   ```

3. **Middleware** (`backend/src/middleware/*.ts`):
   ```typescript
   export const validateFileUpload = (req, res, next) => {
     debugger; // Or set breakpoint here
     // Validation logic
   };
   ```

### Frontend Debugging

**Use Browser Developer Tools:**

1. **Open Chrome/Firefox DevTools** (F12)
2. **Go to Sources tab**
3. **Set breakpoints** in React components
4. **Use React Developer Tools** extension

**Console Debugging:**
```typescript
// In React components
console.log('Component state:', state);
console.log('Props:', props);
console.error('Error occurred:', error);
```

## 🔍 Debug Information

### Backend Debug Info

**Environment Variables:**
```bash
NODE_ENV=development
PORT=3001
TS_NODE_PROJECT=./tsconfig.json
```

**Debug Ports:**
- Inspector: `9229`
- Application: `3001`

**Source Maps:**
- Generated in `backend/dist/` with `.map` files
- TypeScript source in `backend/src/`

### Useful Debug Commands

**Check if debug port is in use:**
```bash
lsof -i :9229
```

**Kill process on debug port:**
```bash
lsof -ti:9229 | xargs kill -9
```

**Check Node.js processes:**
```bash
ps aux | grep node
```

**Test API endpoints:**
```bash
# Health check
curl http://localhost:3001/api/health

# Upload test (without file)
curl -X POST http://localhost:3001/api/upload
```

## 🚀 Quick Debug Setup

### For `start_processing` Function

1. **Open** `backend/src/routes/process.ts`
2. **Set a breakpoint** on line where `startProcessing` is called
3. **Use "Launch Backend (Development)"** configuration
4. **Make a request** from the frontend or use curl:
   ```bash
   curl -X POST http://localhost:3001/api/process \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test-session"}'
   ```

### Debug Flow for File Upload

1. **Set breakpoints in:**
   - `backend/src/routes/upload.ts` (upload handler)
   - `backend/src/middleware/upload.ts` (file validation)
   - `backend/src/routes/process.ts` (processing start)

2. **Start debugging** with "Launch Backend (Development)"

3. **Upload a file** from the frontend

4. **Step through** the code using:
   - **F10** - Step over
   - **F11** - Step into
   - **Shift+F11** - Step out
   - **F5** - Continue

## 📊 Debug Console Commands

When debugging, you can evaluate expressions in the Debug Console:

```javascript
// Check request object
req.body
req.file
req.params

// Check variables
sessionId
uploadState
processingResult

// Call functions
JSON.stringify(someObject, null, 2)
```

## 🛠️ Advanced Debugging

### Debug with Different Node.js Versions

```bash
# Using nvm
nvm use 18
npm run debug
```

### Debug Production Build

```bash
cd backend
npm run build
node --inspect=9229 dist/server.js
```

### Debug Tests

Use "Debug Backend Tests" configuration to debug Jest tests with breakpoints.

### Memory and Performance Debugging

```bash
# Start with memory profiling
node --inspect=9229 --max-old-space-size=4096 src/server.ts
```

## 📝 Debug Checklist

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Source maps are enabled in `tsconfig.json`
- [ ] Correct launch configuration selected
- [ ] Breakpoints set in `.ts` files (not `.js`)
- [ ] Debug port (9229) is not in use by another process
- [ ] VS Code workspace is opened at project root
- [ ] Node.js version is compatible (v18+)

## 🆘 Getting Help

If debugging still doesn't work:

1. **Check VS Code Output panel** for error messages
2. **Look at the Debug Console** for connection errors
3. **Verify the Integrated Terminal** shows the server starting
4. **Test the API manually** with curl to ensure it's running
5. **Restart VS Code** completely
6. **Clear Node.js cache**: `rm -rf node_modules package-lock.json && npm install`

Remember: Debugging TypeScript requires source maps and proper configuration. The setup above should resolve most common issues with breakpoint binding.