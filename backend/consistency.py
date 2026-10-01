import json
from ai import get_client

def check_consistency(event_brief: dict, generated_package: dict) -> dict:
    try:
        client = get_client()
        
        prompt = f"""
        You are a strict consistency checker.
        You will compare the SOURCE EVENT BRIEF against the AI GENERATED PACKAGE.
        
        You must check if the following critical fields from the SOURCE match the information in the GENERATED PACKAGE (all sections):
        1. Event Name
        2. Date
        3. Time
        4. Venue
        5. Registration Link
        
        SOURCE EVENT BRIEF:
        {json.dumps(event_brief, indent=2)}
        
        AI GENERATED PACKAGE:
        {json.dumps(generated_package, indent=2)}
        
        Return a JSON object with this exact structure:
        {{
          "status": "pass" | "warning",
          "mismatches": [
            {{
              "field": "date",
              "section": "email",
              "expected": "15 October 2026",
              "found": "16 October 2026"
            }}
          ]
        }}
        If there are no mismatches, status should be "pass" and mismatches should be an empty list.
        """
        
        from google.genai import types
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Error checking consistency: {e}")
        return {"status": "warning", "mismatches": [], "message": "Failed to run consistency check."}
