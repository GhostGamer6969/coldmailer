# Project: Internship Cold Emailer

## Objective
Automate the process of sending personalized cold emails to companies for a summer internship.

## Core Features
1.  **Company & Contact Scraping:**
    *   Scrape company websites or platforms (like LinkedIn, AngelList) for relevant companies.
    *   Identify and extract contact information of key people (recruiters, engineering managers).
2.  **Email Personalization:**
    *   Use a template engine (like Handlebars or EJS) to personalize emails.
    *   Variables to include:
        *   `[CompanyName]`
        *   `[ContactPersonName]`
        *   `[JobTitle]` (e.g., "Software Engineering Intern")
        *   `[YourName]`
        *   `[YourPortfolioLink]`
        *   `[YourResumeLink]`
3.  **Email Sending:**
    *   Integrate with an email service provider (like Gmail API, SendGrid, etc.).
    *   Schedule and send emails.
    *   Handle rate limiting and avoid being marked as spam.
4.  **Tracking & Analytics:**
    *   Track email opens and link clicks.
    *   Store sent emails and responses in a database.
    *   Provide a simple dashboard to view the status of each application.
5.  **Configuration:**
    *   Store configuration in a `config.json` file.
    *   Configuration should include:
        *   Email credentials
        *   Email templates
        *   List of target companies/keywords
        *   Your personal information

## Tech Stack
*   **Language:** Python
*   **Scraping:** Requests & BeautifulSoup or Scrapy
*   **Email Sending:** smtplib (standard library)
*   **Database:** SQLite or a simple JSON file database
*   **CLI Interface:** Argparse or Click

## To-Do List
* [x] **Phase 1: Core Setup**
    * [x] Initialize Python project (create `requirements.txt`).
    * [x] Set up project structure (folders for `src`, `config`, `templates`).
    * [x] Create `config.json` with placeholder values.
    * [x] Create a basic email template in `templates/email_template.txt`.
* [x] **Phase 2: Scraping**
    * [x] Implement a scraper for one target platform (e.g., a specific job board) using `requests` and `BeautifulSoup`.
    * [x] Store scraped data in a structured format (e.g., JSON file or CSV).
* [x] **Phase 3: Email Sending**
    * [x] Set up email sending with `smtplib` using credentials from `config.json`.
    * [x] Write a script to read scraped data and send a personalized email using the template.
* [ ] **Phase 4: Tracking**
    * [ ] Implement a simple database (SQLite or JSON) to store sent email data.
    * [ ] Track email status (sent, failed).
* [ ] **Phase 5: CLI**
    * [ ] Create a CLI using `argparse` or `Click` to run different actions (e.g., `scrape`, `send`).
* [ ] **Phase 6: Refinement & Documentation**
    * [ ] Add error handling and logging.
    * [ ] Refine email templates.
    * [ ] Update `README.md` with setup and usage instructions.
