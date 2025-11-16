import json
import time
import random
from mailer import OutlookMailer
from utils import load_company_data
from template_engine import load_template, render_template
from ai_personalizer import generate_personalization


def main():
    config = json.load(open("config/config.json"))
    client_id = config["email"]["client_id"]
    user_info = config["user_info"]

    template = load_template("templates/email_template.txt")
    companies = load_company_data("data/companies.csv")

    mailer = OutlookMailer(client_id)

    for company in companies:
        company_name = company.get("Company", "")
        industry = company.get("Company Industry", "")
        linkedin_url = company.get("Company Linkedin Url", "")

        # 👉 AI-based personalization
        ai_data = generate_personalization(company_name, industry, linkedin_url)

        replacements = {
            "ContactPersonName": company.get("Contact Name", "Hiring Manager"),
            "CompanyName": company_name,
            "JobTitle": user_info.get("job_title", "Software Engineering"),
            "SpecificArea": ai_data["SpecificArea"],
            "Reason": ai_data["Reason"],
            "YourName": user_info["name"],
            "YourPortfolioLink": user_info["portfolio_link"],
            "YourLinkedIn": user_info.get("linkedin_link", ""),
            "YourGithub": user_info.get("github_link", "")
        }

        body = render_template(template, replacements)
        subject = f"Internship Application — {replacements['JobTitle']} at {company_name}"

        # Send email with resume pdf
        status, resp = mailer.send_email(
            company.get("Email"),
            subject,
            body,
            user_info["resume_path"]
        )

        print(f"[{status}] Sent to {company['Email']} ({company_name})")

        # RANDOM HUMAN-LIKE DELAY
        sleep_time = random.uniform(7, 18)
        print(f"Sleeping for {round(sleep_time, 1)}s\n")
        time.sleep(sleep_time)


if __name__ == "__main__":
    main()
