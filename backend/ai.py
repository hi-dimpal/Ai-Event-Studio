import os
import time
import json
import base64

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

    Do not invent or silently change critical information
    (date, time, venue, event name, registration link).

    Expand and describe, but use the exact core details provided.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3.8-flash",
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
        print(f"ERROR TYPE: {type(e).__name__}")
        print(f"ERROR DETAILS: {e}")
        raise


def generate_poster(event_brief: dict):
    try:
        client = get_client()

        prompt = f"""
        Create a professional promotional poster for this event.

        Event Name: {event_brief.get('event_name')}
        Event Type: {event_brief.get('event_type')}
        Date: {event_brief.get('date')}
        Time: {event_brief.get('time')}
        Venue: {event_brief.get('venue')}
        Theme: {event_brief.get('theme')}
        Target Audience: {event_brief.get('target_audience')}

        Create a modern, clean and attractive college event poster.

        Clearly display:
        - Event name
        - Event type
        - Date
        - Time
        - Venue
        - Theme

        Use a professional AI and technology visual style.
        Make the poster visually appealing and suitable for event promotion.
        """

        response = client.models.generate_content(
            model="imagen-3.0-generate-002",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            )
        )

        for candidate in getattr(response, "candidates", []) or []:
            parts = getattr(getattr(candidate, "content", None), "parts", []) or []
            for item in parts:
                inline_data = getattr(item, "inline_data", None)
                if inline_data is not None:
                    image_bytes = inline_data.data
                    b64_img = base64.b64encode(image_bytes).decode("utf-8")
                    return f"data:image/png;base64,{b64_img}"

        if getattr(response, "text", None):
            print(response.text)

        for part in getattr(response, "parts", []) or []:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is not None:
                image_bytes = inline_data.data
                b64_img = base64.b64encode(image_bytes).decode("utf-8")
                return f"data:image/png;base64,{b64_img}"

        print("No image was returned by Gemini.")
        return None

    except Exception as e:
        print(f"ERROR TYPE: {type(e).__name__}")
        print(f"ERROR DETAILS: {e}")
        return None