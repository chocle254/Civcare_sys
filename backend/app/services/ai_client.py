import os
from groq import AsyncGroq

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")


async def ask_gemini(prompt: str, system_context: str = "") -> str:
    """
    Drop-in replacement for the original ask_gemini.
    Used by triage_agent and medscan_agent.
    Sends a single prompt and returns the AI response.
    """
    try:
        messages = []
        if system_context:
            messages.append({"role": "system", "content": system_context})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Groq error: {e}")
        return "I am having trouble processing that right now. Please try again."


async def ask_gemini_with_history(messages: list, system_context: str = "") -> str:
    """
    Drop-in replacement for the original ask_gemini_with_history.
    Used by the orchestrator to maintain conversation context.

    Accepts Gemini-style messages:
    [{"role": "user", "parts": ["..."]}, {"role": "model", "parts": ["..."]}]
    Converts them to Groq/OpenAI format automatically.
    """
    try:
        groq_messages = []

        if system_context:
            groq_messages.append({"role": "system", "content": system_context})

        for msg in messages:
            # Convert Gemini "model" role to "assistant", keep "user" as is
            role = "assistant" if msg["role"] == "model" else msg["role"]
            # Gemini uses "parts" list, Groq uses "content" string
            content = msg["parts"][0] if isinstance(msg.get("parts"), list) else msg.get("content", "")
            groq_messages.append({"role": role, "content": content})

        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=groq_messages,
            max_tokens=400,
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Groq chat error: {e}")
        return "I am having trouble processing that right now. Please try again."
