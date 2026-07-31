"""
Co-writer (autocomplete) service.

Produces context-aware drafting options through the shared LLM cascade.
"""
from __future__ import annotations

import json
import re


ACTION_INSTRUCTIONS = {
    "continue": "Continue naturally from the final sentence without repeating it.",
    "next_paragraph": "Write the next complete paragraph that advances the same argument or narrative.",
    "expand": "Develop the final idea with a useful example, reason, or concrete detail without inventing facts.",
    "transition": "Write a smooth transition into the most logical next point.",
    "outline": "Suggest a concise sequence of next points the writer can develop.",
}

TONE_INSTRUCTIONS = {
    "match": "Match the draft's existing voice, person, tense, vocabulary, and level of formality.",
    "professional": "Use a polished, direct professional voice.",
    "friendly": "Use a warm, clear, conversational voice.",
    "academic": "Use a precise, objective academic voice without fabricated citations.",
    "persuasive": "Use a confident, evidence-led persuasive voice without exaggeration.",
    "creative": "Use vivid, original language while staying coherent with the draft.",
}


def generate_suggestions(
    text: str,
    max_tokens: int = 50,
    num_suggestions: int = 3,
    action: str = "continue",
    tone: str = "match",
    model: str = "standard",
) -> tuple[list[str], str]:
    """Generate distinct continuations plus the provider model actually used."""
    try:
        return _suggest_llm(text, max_tokens, num_suggestions, action, tone, model)
    except RuntimeError:
        return _fallback_suggestions(text, num_suggestions, action), "fallback"


def _suggest_llm(
    text: str,
    max_tokens: int,
    n: int,
    action: str,
    tone: str,
    model: str,
) -> tuple[list[str], str]:
    from services.llm_client import llm_chat, llm_chat_premium

    action_instruction = ACTION_INSTRUCTIONS.get(action, ACTION_INSTRUCTIONS["continue"])
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["match"])
    system_prompt = (
        "You are an expert co-writer working beside the author, not replacing them. "
        "Respect every established fact, name, tense, point of view, and formatting cue. "
        "Do not summarize the draft, mention these instructions, add fake facts, or restart the text. "
        f"{action_instruction} {tone_instruction} "
        f"Return exactly {n} genuinely different options as a valid JSON array of strings. "
        "Return only the JSON array with no markdown or explanation."
    )
    user_prompt = (
        f"Draft:\n{text[-9000:]}\n\n"
        f"Each option should be no more than about {max_tokens} words and should be ready to insert directly."
    )

    if model == "standard":
        raw = llm_chat(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.78,
            max_tokens=max_tokens * n + 180,
        )
        model_used = "standard"
    else:
        raw, model_used = llm_chat_premium(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            temperature=0.78,
            max_tokens=max_tokens * n + 180,
        )

    return _parse_suggestions(raw, text, n), model_used


def _parse_suggestions(raw: str, source_text: str, count: int) -> list[str]:
    """Parse JSON-first output with a numbered-list compatibility fallback."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.IGNORECASE).replace("```", "").strip()
    suggestions: list[str] = []
    array_match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
    if array_match:
        try:
            values = json.loads(array_match.group(0))
            if isinstance(values, list):
                suggestions.extend(str(value).strip() for value in values)
        except json.JSONDecodeError:
            pass

    if not suggestions:
        for line in cleaned.splitlines():
            value = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip(' \t"“”')
            if value and value not in {"[]", "{}"}:
                suggestions.append(value)

    source_key = source_text.strip().casefold()
    unique: list[str] = []
    for suggestion in suggestions:
        value = suggestion.strip()
        if not value or value.casefold() == source_key:
            continue
        if value.casefold() not in {item.casefold() for item in unique}:
            unique.append(value)
        if len(unique) == count:
            break
    if not unique:
        raise RuntimeError("The writing model returned no usable suggestions")
    return unique


# ── Local fallback ───────────────────────────────────────────────────────────

def _fallback_suggestions(text: str, count: int, action: str) -> list[str]:
    """Fast, insertable fallbacks used only when every remote provider is down."""
    subject = re.split(r"(?<=[.!?])\s+", text.strip())[-1].rstrip(".!?")
    templates = {
        "continue": [
            f"This matters because {subject[:120].lower()} shapes what should happen next.",
            "The next step is to turn that idea into a clear, practical action.",
            "A concrete example can make the point easier to understand and apply.",
        ],
        "next_paragraph": [
            "The broader implication is worth considering. A strong response connects the main idea to a practical outcome and explains why that outcome matters.",
            "From here, the discussion can move from the central claim to its real-world effect, using one specific example to keep the argument grounded.",
            "The next point should build on this foundation by identifying the clearest consequence and the action it requires.",
        ],
        "expand": [
            "One way to develop this point is to add a concrete example, explain its effect, and connect it back to the central argument.",
            "This idea becomes stronger when the reasoning behind it is stated directly and supported with a practical detail.",
            "The key is to show not only what happens, but also why it matters in the larger context.",
        ],
        "transition": [
            "With that foundation in place, the next question is how the idea works in practice.",
            "That leads naturally to the broader impact and the choices that follow from it.",
            "The same principle also helps explain the next part of the discussion.",
        ],
        "outline": [
            "• Clarify the main claim\n• Add one concrete example\n• Explain the impact\n• Close with the next action",
            "• Establish the context\n• Present the strongest reason\n• Address a likely concern\n• End with a clear conclusion",
            "• Define the goal\n• Describe the current challenge\n• Compare the available options\n• Recommend the best next step",
        ],
    }
    return templates.get(action, templates["continue"])[:count]
