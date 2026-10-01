# AI Event Studio

AI Event Studio is an AI-powered event planning and promotion platform built for the hackathon.

It allows organizers to input an event brief and instantly generate a complete event package (agenda, checklist, instructions, communication, marketing, and promotional poster) using Gemini AI.

## Technology Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI
- **Database**: SQLite
- **AI Integration**: Google Gemini API (gemini-2.5-flash for text, imagen-3.0-generate-002 for images)

## Setup Instructions

### 1. Gemini API Key
Create a `.env` file in the `backend` directory and add your API key:
```env
GEMINI_API_KEY=your_actual_key_here
```

### 2. Run Backend
Open a terminal and run:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*(Note: If requirements.txt is missing, simply run `pip install fastapi uvicorn google-genai python-dotenv pydantic`)*

### 3. Run Frontend
Open another terminal and run:
```bash
cd frontend
npm install
npm run dev
```

## Demo Workflow
1. Open the app (usually `http://localhost:5173`).
2. Click **Create Event**.
3. Fill out the Event Brief.
4. Click **Generate Event Package**.
5. Wait for the AI to generate the planning, communication, and marketing content.
6. Verify the **Consistency Check** status to ensure the AI used the correct critical details.
7. Scroll down to generate an AI **Promotional Poster**.
8. Go to **My Events** to see the saved event.
9. Open the event, edit a detail (e.g., Venue), and click **Regenerate Package**.
10. Check the consistency checker again to see it updated successfully.

---
*Built for the 4-hour hackathon.*
