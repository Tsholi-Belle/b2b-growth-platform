import os
from google import genai
from google.genai import types

# Initialize Gemini Client (uses GEMINI_API_KEY environment variable)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def enrich_lead_profile(domain: str) -> dict:
    """Fetches company profile data given a domain name."""
    # In production, replace with real API call (e.g., Clearbit, Apollo, or internal DB)
    return {
        "domain": domain,
        "company_size": "50-200 employees",
        "industry": "FinTech",
        "tech_stack": ["Google Cloud", "Python", "React"],
        "recent_news": "Raised Series A funding for infrastructure expansion."
    }

def generate_growth_outreach(prospect_domain: str) -> str:
    """Uses Gemini 1.5 Pro with Tool Calling to research prospect domain and compose outreach."""
    prompt = f"Investigate company {prospect_domain} and compose a personalized cold outreach email."
    
    response = client.models.generate_content(
        model="gemini-1.5-pro",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are an expert B2B growth agent. Use the provided tools to research "
                "prospect domains before drafting compelling, highly personalized pitch emails."
            ),
            temperature=0.7, # Higher temperature for creative copywriting
            tools=[enrich_lead_profile], # Pass tool directly to Gemini
        ),
    )
    return response.text

if __name__ == "__main__":
    example_domain = "acmepayments.com"
    print(f"🔍 Running B2B Outreach Agent for: {example_domain}...\n")
    email_draft = generate_growth_outreach(example_domain)
    print("--------------------------------------------------")
    print(email_draft)
    print("--------------------------------------------------")
