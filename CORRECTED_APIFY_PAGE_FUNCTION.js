async function pageFunction(context) {
    const { request, log, page } = context;
    
    try {
        // Add safety check for page object
        if (!page) {
            log.error(`Page object not available for ${request.url}`);
            return {
                source_url: request.url,
                source_name: request.url.includes('visitloudoun') ? 'Visit Loudoun Events RSS' :
                    request.url.includes('fxva.com/rss') ? 'FXVA Events RSS' :
                        request.url.includes('virginia.org/feeds') ? 'Virginia Tourism Events RSS' :
                            request.url.includes('visitpwc') ? 'Prince William County Events RSS' :
                                request.url.includes('visitfauquier') ? 'Visit Fauquier Events RSS' :
                                    request.url.includes('northernvirginiamag') ? 'Northern Virginia Magazine Events RSS' :
                                        request.url.includes('discoverclarkecounty') ? 'Discover Clarke County Events RSS' :
                                            request.url.includes('fxva.com/events') ? 'FXVA Events HTML' :
                                                request.url.includes('virginia.org/events') ? 'Virginia Tourism Events HTML' :
                                                    request.url.includes('fauquiercounty.gov') ? 'Fauquier County Government Calendar' :
                                                        request.url.includes('warrencountyva.gov') ? 'Warren County Events' :
                                                            request.url,
                raw_content: 'Error: Page object not available',
                scrape_timestamp: new Date().toISOString()
            };
        }
        
        log.info(`Processing: ${request.url}`);
        
        // Wait for page to load completely
        await page.waitForTimeout(3000);
        
        // Try to wait for network to be idle (for dynamic content)
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (networkError) {
            log.warning(`Network idle timeout for ${request.url}, continuing anyway`);
        }
        
        // Get the page content with error handling
        let content;
        try {
            content = await page.content();
        } catch (contentError) {
            log.error(`Failed to get page content for ${request.url}:`, contentError);
            content = 'Error: Failed to retrieve page content';
        }
        
        // Validate content
        if (!content || content.length < 100) {
            log.warning(`Content too short or empty for ${request.url}`);
            content = content || 'Error: Empty content received';
        }
        
        // Return the data in the format expected by your webhook
        return {
            source_url: request.url,
            source_name: request.url.includes('visitloudoun') ? 'Visit Loudoun Events RSS' :
                request.url.includes('fxva.com/rss') ? 'FXVA Events RSS' :
                    request.url.includes('virginia.org/feeds') ? 'Virginia Tourism Events RSS' :
                        request.url.includes('visitpwc') ? 'Prince William County Events RSS' :
                            request.url.includes('visitfauquier') ? 'Visit Fauquier Events RSS' :
                                request.url.includes('northernvirginiamag') ? 'Northern Virginia Magazine Events RSS' :
                                    request.url.includes('discoverclarkecounty') ? 'Discover Clarke County Events RSS' :
                                        request.url.includes('fxva.com/events') ? 'FXVA Events HTML' :
                                            request.url.includes('virginia.org/events') ? 'Virginia Tourism Events HTML' :
                                                request.url.includes('fauquiercounty.gov') ? 'Fauquier County Government Calendar' :
                                                    request.url.includes('warrencountyva.gov') ? 'Warren County Events' :
                                                        request.url,
            raw_content: content,
            scrape_timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        log.error(`Error processing ${request.url}:`, error);
        
        // Return error data in the expected format
        return {
            source_url: request.url,
            source_name: request.url.includes('visitloudoun') ? 'Visit Loudoun Events RSS' :
                request.url.includes('fxva.com/rss') ? 'FXVA Events RSS' :
                    request.url.includes('virginia.org/feeds') ? 'Virginia Tourism Events RSS' :
                        request.url.includes('visitpwc') ? 'Prince William County Events RSS' :
                            request.url.includes('visitfauquier') ? 'Visit Fauquier Events RSS' :
                                request.url.includes('northernvirginiamag') ? 'Northern Virginia Magazine Events RSS' :
                                    request.url.includes('discoverclarkecounty') ? 'Discover Clarke County Events RSS' :
                                        request.url.includes('fxva.com/events') ? 'FXVA Events HTML' :
                                            request.url.includes('virginia.org/events') ? 'Virginia Tourism Events HTML' :
                                                request.url.includes('fauquiercounty.gov') ? 'Fauquier County Government Calendar' :
                                                    request.url.includes('warrencountyva.gov') ? 'Warren County Events' :
                                                        request.url,
            raw_content: `Error processing page: ${error.message}`,
            scrape_timestamp: new Date().toISOString()
        };
    }
}