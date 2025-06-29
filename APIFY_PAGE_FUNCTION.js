async function pageFunction(context) {
    const { request, log, page } = context;
    
    try {
        log.info(`Processing: ${request.url}`);
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Get the page content
        const content = await page.content();
        
        // Get page title
        const title = await page.title();
        
        // Return the data in the format expected by the webhook
        return {
            url: request.url,
            title: title || 'No title',
            text: content || '',
            actorRunId: process.env.APIFY_ACTOR_RUN_ID || 'unknown',
            finishedAt: new Date().toISOString()
        };
        
    } catch (error) {
        log.error(`Error processing ${request.url}:`, error);
        
        // Return minimal data even on error
        return {
            url: request.url,
            title: 'Error',
            text: `Error processing page: ${error.message}`,
            actorRunId: process.env.APIFY_ACTOR_RUN_ID || 'unknown',
            finishedAt: new Date().toISOString()
        };
    }
}