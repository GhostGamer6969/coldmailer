import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

genai.configure(api_key=API_KEY)


def generate_personalization(company_name, industry, linkedin_url):
    prompt = f"""
Generate a concise and highly personalized cold-email personalization section.

Company: {company_name}
Industry: {industry}
LinkedIn: {linkedin_url}

Return TWO lines ONLY:
SpecificArea: <1 short sentence describing what this company focuses on>
Reason: <1 short sentence explaining why you'd admire their work>
"""

    model = genai.GenerativeModel("gemini-2.5-flash")

    response = model.generate_content(prompt)

    text = response.text.strip()

    data = {"SpecificArea": "", "Reason": ""}

    for line in text.split("\n"):
        if line.lower().startswith("specificarea"):
            data["SpecificArea"] = line.split(":", 1)[1].strip()
        if line.lower().startswith("reason"):
            data["Reason"] = line.split(":", 1)[1].strip()

    # Safety fallback:
    if not data["SpecificArea"]:
        data["SpecificArea"] = industry or "your industry focus"
    if not data["Reason"]:
        data["Reason"] = "your innovative work and engineering culture"

    return data
