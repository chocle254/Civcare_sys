import google.generativeai as genai
from app.config import settings

# Configure Gemini once on import
genai.configure(api_key=settings.GEMINI_API_KEY)

# Use flash model — fastest free tier available
model = genai.GenerativeModel(
    model_name=settings.GEMINI_MODEL,
    generation_config={
        "temperature": 0.3,       # Low temp = more consistent clinical responses
        "top_p": 0.9,
        "top_k": 40,
        "max_output_tokens": 512, # Keep responses short and fast
    },
    safety_settings=[
        {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]
)


async def ask_gemini(prompt: str, system_context: str = "") -> str:
    """
    Send a prompt to Gemini and return the response text.
    Used by all three agents — triage, medscan, records.
    """
    try:
        full_prompt = f"{system_context}\n\n{prompt}" if system_context else prompt
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return "I am having trouble processing that right now. Please try again."


async def ask_gemini_with_history(messages: list, system_context: str = "") -> str:
    """
    Send a full conversation history to Gemini.
    Used by the orchestrator to maintain conversation context.

    messages format:
    [{"role": "user", "parts": ["..."]}, {"role": "model", "parts": ["..."]}]
    """
    try:
        chat = model.start_chat(history=messages[:-1])  # All but last message is history
        last_message = messages[-1]["parts"][0]
        if system_context:
            last_message = f"{system_context}\n\n{last_message}"
        response = chat.send_message(last_message)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini chat error: {e}")
        return "I am having trouble processing that right now. Please try again."
