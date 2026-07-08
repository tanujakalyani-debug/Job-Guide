import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { text } from 'stream/consumers';

test('scrape LinkedIn jobs', async ({ page }) => {
  // 1. Navigate to LinkedIn Jobs
  await page.goto('https://www.linkedin.com/jobs/search');
  
  // 2. Login (if needed)
  // Store credentials securely in .env file
  //const email = process.env.LINKEDIN_EMAIL;
  //const password = process.env.LINKEDIN_PASSWORD;
  
  /*if (email && password) {

    await page.fill('input[name="session_key"]', email);
    await page.fill('input[name="session_password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }*/
  
  // 3. Search for jobs
  await console.log(await page.title());
  const Button_Modal = page.locator("(//button[@aria-label='Dismiss'])[1]");
  const Section_Modal = page.getByRole("dialog").nth(0);
  // await Button_Modal.highlight();
  await Section_Modal.waitFor({state:"visible"});
  await Button_Modal.click({force: true});
  // await Section_Modal.waitFor({state:"hidden"});
  const searchQuery = 'Software Engineer';
  const location = 'Remote';
  
  // await page.fill('input[aria-label="Search by title, skill, or company"]', searchQuery);
  // await page.fill('input[aria-label="City, state, or zip code"]', location);
  // await page.click('button[aria-label="Search"]');
  
  // Wait for results to load
  await page.getByPlaceholder("Search job titles or companies").fill(searchQuery)
  await page.getByPlaceholder("Location").fill(location)
  await page.keyboard.press("Enter")
  await console.log("LinkedIn")
    // await console.log(page.getByRole('ul',{'class' : 'jobs-search__results-list'}))
  await page.waitForSelector('.two-pane-serp-page__results-list')
  const Jobs_List = await page.locator(".two-pane-serp-page__results-list")
  // 4. Extract job listings
  const jobs = [];
  let pageNum = 1;
  const maxPages = 2; 
  // Scrape first 2 pages
  
  while (pageNum <= maxPages) {
    console.log(`Scraping page ${pageNum}...`);
    
    // Get all job cards on current page
    const List = await page.locator('ul.jobs-search__results-list li')
    await List.first().waitFor({state:'visible'})
    console.log(await List.first().locator('div >div>h3').innerText())
    const jobCards = await List.count()
    console.log("Number of Jobs : "+jobCards)
  
  const cards=[];
  for (let i = 0; i < 5; i++) {
    cards[i] = List.nth(i);
    // Example: get job title
    const title = await cards[i].locator('h3').innerText();
    console.log(cards[i])
    console.log(`Job ${i + 1}: ${title}`);
  }
  console.log(cards);
  await cards[0].click();
  for (const card of cards) {
    console.log(card);
    try {
      // Click on job card to load details
      console.log("Before click:", page.isClosed());
      await card.click();
      console.log("After click:", page.isClosed());
      // await page.waitForTimeout(1000); // Wait for details to load
      
      // Extract job data
      const jobData = await extractJobDetails(page);
      jobs.push(jobData);
      
      console.log(`Extracted: ${jobData.title} at ${jobData.company}`);
    } catch (error) {
      console.error('Error extracting job:', error.message);
    }
  }
    
    // Navigate to next page
    const nextButton = await page.$('button[aria-label="View next page"]');
    if (nextButton && pageNum < maxPages) {
      await nextButton.click();
      await page.waitForTimeout(2000);
      pageNum++;
    } else {
      break;
    }
  }
  
  // 5. Save scraped data
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const outputPath = path.join('data', 'jobs', `jobs_${timestamp}.json`);
  
  // Create directory if it doesn't exist
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  // Save to file
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
  
  console.log(`Scraped ${jobs.length} jobs and saved to ${outputPath}`);
});

// Helper function to extract job details
async function extractJobDetails(page) {
  console.log("Lets explore each Job in detail")
  // Wait for job details panel to load
  await page.locator("[aria-label='Show more']").click();
  
  // Extract all fields
  const title = await page.$eval(
    '.job-details__title',
    el => el.textContent.trim()
  ).catch(() => 'N/A');
  
  const company = await page.$eval(
    '.job-details__company-name',
    el => el.textContent.trim()
  ).catch(() => 'N/A');
  
  const location = await page.$eval(
    '.job-details__location',
    el => el.textContent.trim()
  ).catch(() => 'N/A');
  
  const description = await page.$eval(
    '.job-details__description',
    el => el.textContent.trim()
  ).catch(() => 'N/A');
  
  const jobUrl = await page.url();
  
  // Extract job ID from URL
  const jobIdMatch = jobUrl.match(/jobs\/view\/(\d+)/);
  const jobId = jobIdMatch ? jobIdMatch[1] : generateJobId(title, company);
  
  // Extract posted date
  const postedDate = await page.$eval(
    '.job-details__posted-date',
    el => el.textContent.trim()
  ).catch(() => 'N/A');
  
  // Extract applicant count
  const applicantCount = await page.$eval(
    '.job-details__applicant-count',
    el => {
      const text = el.textContent.trim();
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
  ).catch(() => 0);
  
  // Parse employment type and experience level
  const jobCriteria = await page.$$eval(
    '.job-details__criteria-item',
    items => items.map(item => ({
      label: item.querySelector('.job-details__criteria-label')?.textContent.trim(),
      value: item.querySelector('.job-details__criteria-value')?.textContent.trim()
    }))
  ).catch(() => []);
  
  const employmentType = jobCriteria.find(c => c.label === 'Employment type')?.value || 'N/A';
  const experienceLevel = jobCriteria.find(c => c.label === 'Seniority level')?.value || 'N/A';
  
  return {
    jobId,
    title,
    company,
    location,
    employmentType,
    experienceLevel,
    description,
    jobUrl,
    postedDate,
    applicantCount,
    scrapedAt: new Date().toISOString(),
    status: 'active',
    applicationStatus: 'not_applied'
  };
}

// Generate unique job ID
function generateJobId(title, company) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5')
    .update(`${title}-${company}-${Date.now()}`)
    .digest('hex');
  return hash.substring(0, 16);
}

