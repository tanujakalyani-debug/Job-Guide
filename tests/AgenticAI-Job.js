const {test, expect} = require('@playwright/test');

test.only('First Playwright TestCase',async ({browser})=> {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/jobs/search");
    await console.log(await page.title());
    await page.getByRole('Button', {'aria-label' : 'Dismiss'}).click
    await page.waitForTimeout(3000)
    await page.getByPlaceholder("Search job titles or companies").fill("QA Automation")
    await page.getByPlaceholder("Location").fill("Remote")
    await page.keyboard.press("Enter")
    await console.log("LinkedIn")
    await page.pause
});


