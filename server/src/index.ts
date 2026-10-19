import { app, ensureDbInitialized } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  try {
    await ensureDbInitialized();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
