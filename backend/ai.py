import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def get_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    return genai.Client(api_key=api_key)

def generate_event_package(event_brief: dict) -> dict:
    client = get_client()
    
    prompt = f"""
    You are an expert AI event planner and promoter.
    Based on the following Event Brief, generate a complete event package.
    
    EVENT BRIEF:
    {json.dumps(event_brief, indent=2)}
    
    You MUST output valid JSON only, following this exact structure:
    {{
      "event_concept": {{
        "summary": "...",
        "purpose": "...",
        "audience": "...",
        "value_proposition": "..."
      }},
      "agenda": [
        {{
          "time": "...",
          "activity": "...",
          "description": "..."
        }}
      ],
      "organizer_checklist": ["...", "..."],
      "participant_instructions": ["...", "..."],
      "invitation": "...",
      "email": "...",
      "social_media": {{
        "instagram": "...",
        "linkedin": "...",
        "short_caption": "...",
        "hashtags": ["...", "..."]
      }},
      "promotion_campaign": [
        {{
          "day": "...",
          "content": "...",
          "purpose": "..."
        }}
      ]
    }}
    
    Do not invent or silently change critical information (date, time, venue, event name, registration link). 
    Expand and describe, but use the exact core details provided.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        try:
            package = json.loads(response.text)
            return package
        except json.JSONDecodeError:
            print("Failed to parse JSON")
            raise ValueError("AI returned invalid JSON")
            
    except Exception as e:
        print(f"Error generating package: {e}")
        raise ValueError("Failed to generate event package")

def generate_poster(event_brief: dict):
    try:
        client = get_client()
        prompt = f"""
        Create a professional promotional poster for the following event:
        Event Name: {event_brief.get('event_name')}
        Type: {event_brief.get('event_type')}
        Date: {event_brief.get('date')}
        Time: {event_brief.get('time')}
        Venue: {event_brief.get('venue')}
        Theme: {event_brief.get('theme')}
        
        The design should be modern, clean, and engaging, suitable for the target audience: {event_brief.get('target_audience')}.
        """
        
        result = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/jpeg",
                aspect_ratio="3:4"
            )
        )
        if result.generated_images:
            image_bytes = result.generated_images[0].image.image_bytes
            import base64
            b64_img = base64.b64encode(image_bytes).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_img}"
        return None
    except Exception as e:
        print(f"Error generating poster: {e}")
        return None
