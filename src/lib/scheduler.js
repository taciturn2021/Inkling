import cron from 'node-cron';

// Fire-and-forget hourly job triggering the cleanup endpoint
// Runs only on the server during production use; safe to import in layout
if (typeof window === 'undefined') {
  try {
    // Run at minute 7 of every hour to avoid top-of-hour spikes
    cron.schedule('7 * * * *', async () => {
      try {
        const base = process.env.PUBLIC_BASE_URL;
        if (!base) return; // require explicit base URL to avoid localhost ambiguity
        await fetch(`${base}/api/images/cleanup`, { method: 'POST' });
      } catch {}
    }, { timezone: 'UTC' });
  } catch {}
}


