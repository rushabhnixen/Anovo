"""
Backend API tests for Anovo.
All service calls are mocked so no ML models or external services are required.
"""

import sys
import os
from unittest.mock import patch
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Ensure the backend directory is on the path when running from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app  # noqa: E402

client = TestClient(app)


class TestAccountDeletion:
    def test_delete_account_removes_user_and_commits(self):
        from routers.auth import delete_me

        db = MagicMock()
        user = MagicMock()
        with patch("routers.auth.get_user_by_id", return_value=user):
            delete_me(user_id=42, db=db)

        db.delete.assert_called_once_with(user)
        db.commit.assert_called_once_with()


# ── Health ────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_check(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "Anovo API"


# ── Paraphrase ────────────────────────────────────────────────────────────────

class TestParaphrase:
    def test_paraphrase_success(self):
        with patch(
            "routers.paraphrase._paraphrase",
            return_value=("A quick fox leapt over a lazy dog.", "standard"),
        ):
            response = client.post("/api/paraphrase", json={"text": "The quick brown fox jumps over the lazy dog.", "intensity": 3})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert data["original"] == "The quick brown fox jumps over the lazy dog."
        assert data["paraphrased"] == "A quick fox leapt over a lazy dog."
        assert data["intensity"] == 3
        assert data["writing_mode"] == "standard"

    def test_paraphrase_intensity_bounds(self):
        with patch("routers.paraphrase._paraphrase", return_value=("result", "standard")):
            r1 = client.post("/api/paraphrase", json={"text": "Hello world.", "intensity": 1})
            r5 = client.post("/api/paraphrase", json={"text": "Hello world.", "intensity": 5})
        assert r1.status_code == 200
        assert r5.status_code == 200

    def test_paraphrase_invalid_intensity(self):
        response = client.post("/api/paraphrase", json={"text": "Hello world.", "intensity": 10})
        assert response.status_code == 422

    def test_paraphrase_empty_text(self):
        response = client.post("/api/paraphrase", json={"text": "", "intensity": 3})
        assert response.status_code == 422

    def test_paraphrase_service_error(self):
        with patch("routers.paraphrase._paraphrase", side_effect=RuntimeError("model unavailable")):
            response = client.post("/api/paraphrase", json={"text": "Hello.", "intensity": 3})
        assert response.status_code == 500

    def test_contextual_refine_options(self):
        with patch(
            "routers.paraphrase._refine_selection",
            return_value=["Clear writing makes ideas easier to share.", "Good prose communicates ideas clearly."],
        ):
            response = client.post(
                "/api/paraphrase/refine",
                json={
                    "text": "Good writing helps people communicate ideas clearly.",
                    "selected_text": "Good writing helps people communicate ideas clearly.",
                    "kind": "sentence",
                    "writing_mode": "fluency",
                    "intensity": 3,
                    "count": 2,
                },
            )
        assert response.status_code == 200
        assert len(response.json()["suggestions"]) == 2


# ── Grammar ───────────────────────────────────────────────────────────────────

class TestGrammar:
    _good_errors = [
        {
            "message": "Possible agreement error",
            "offset": 5,
            "length": 3,
            "replacements": ["is"],
            "rule_id": "AGREEMENT",
            "category": "GRAMMAR",
        }
    ]

    def test_grammar_check_with_errors(self):
        with patch("routers.grammar.check_grammar", return_value=self._good_errors):
            response = client.post("/api/grammar-check", json={"text": "This are wrong.", "language": "en-US"})
        assert response.status_code == 200
        data = response.json()
        assert data["error_count"] == 1
        assert data["errors"][0]["rule_id"] == "AGREEMENT"

    def test_grammar_check_no_errors(self):
        with patch("routers.grammar.check_grammar", return_value=[]):
            response = client.post("/api/grammar-check", json={"text": "This is correct.", "language": "en-US"})
        assert response.status_code == 200
        data = response.json()
        assert data["error_count"] == 0
        assert data["errors"] == []

    def test_grammar_service_unavailable(self):
        with patch("routers.grammar.check_grammar", side_effect=RuntimeError("LanguageTool unreachable")):
            response = client.post("/api/grammar-check", json={"text": "Hello.", "language": "en-US"})
        assert response.status_code == 503

    def test_grammar_empty_text(self):
        response = client.post("/api/grammar-check", json={"text": "", "language": "en-US"})
        assert response.status_code == 422


# ── Summarize ─────────────────────────────────────────────────────────────────

_LONG_TEXT = (
    "Artificial intelligence is transforming the world in many ways. "
    "From healthcare to finance, AI is being applied to solve complex problems. "
    "Machine learning models can now outperform humans in specific tasks. "
    "However, ethical concerns and bias remain significant challenges. "
    "Research into explainable AI aims to make models more transparent and trustworthy."
)


class TestSummarize:
    def test_summarize_paragraph(self):
        with patch("routers.summarize._summarize", return_value="AI is changing the world."):
            response = client.post("/api/summarize", json={"text": _LONG_TEXT, "mode": "paragraph", "max_length": 150})
        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == "AI is changing the world."
        assert data["mode"] == "paragraph"

    def test_summarize_bullet(self):
        bullets = "• AI is transforming healthcare.\n• Ethical concerns exist."
        with patch("routers.summarize._summarize", return_value=bullets):
            response = client.post("/api/summarize", json={"text": _LONG_TEXT, "mode": "bullet", "max_length": 150})
        assert response.status_code == 200
        assert response.json()["mode"] == "bullet"

    def test_summarize_text_too_short(self):
        response = client.post("/api/summarize", json={"text": "Too short.", "mode": "paragraph", "max_length": 150})
        assert response.status_code == 422

    def test_summarize_service_error(self):
        with patch("routers.summarize._summarize", side_effect=Exception("GPU OOM")):
            response = client.post("/api/summarize", json={"text": _LONG_TEXT, "mode": "paragraph", "max_length": 150})
        assert response.status_code == 500


# ── Translate ─────────────────────────────────────────────────────────────────

class TestTranslate:
    def test_translate_success(self):
        with patch("routers.translate._translate", return_value="Bonjour le monde"):
            response = client.post("/api/translate", json={"text": "Hello world", "source_language": "en", "target_language": "fr"})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert data["translated"] == "Bonjour le monde"
        assert data["source_language"] == "en"
        assert data["target_language"] == "fr"

    def test_translate_empty_text(self):
        response = client.post("/api/translate", json={"text": "", "source_language": "en", "target_language": "fr"})
        assert response.status_code == 422

    def test_translate_service_error(self):
        with patch("routers.translate._translate", side_effect=Exception("model not found")):
            response = client.post("/api/translate", json={"text": "Hello", "source_language": "en", "target_language": "xx"})  # noqa: E501
        assert response.status_code == 500


# ── Humanize ──────────────────────────────────────────────────────────────────

class TestHumanize:
    def test_humanize_success(self):
        mock_result = {"humanized": "Humanized text here.", "steps": {}}
        with patch("routers.humanize._humanize", return_value=mock_result):
            response = client.post("/api/humanize", json={"text": "The utilization of artificial intelligence is widespread."})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert data["humanized"] == "Humanized text here."

    def test_humanize_empty_text(self):
        response = client.post("/api/humanize", json={"text": ""})
        assert response.status_code == 422

    def test_humanize_service_error(self):
        with patch("routers.humanize._humanize", side_effect=Exception("pipeline failed")):
            response = client.post("/api/humanize", json={"text": "Some text to humanize."})
        assert response.status_code == 500


# ── Plagiarism ────────────────────────────────────────────────────────────────

class TestPlagiarism:
    def test_plagiarism_detected(self):
        result = {"similarity_score": 0.95, "is_plagiarized": True, "threshold": 0.8}
        with patch("routers.plagiarism.check_plagiarism", return_value=result):
            response = client.post("/api/plagiarism-check", json={"text": "This is the copied text.", "reference_text": "This is the copied text."})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert data["is_plagiarized"] is True
        assert abs(data["similarity_score"] - 0.95) < 1e-6

    def test_plagiarism_not_detected(self):
        result = {"similarity_score": 0.2, "is_plagiarized": False, "threshold": 0.8}
        with patch("routers.plagiarism.check_plagiarism", return_value=result):
            response = client.post("/api/plagiarism-check", json={"text": "The sky is blue.", "reference_text": "Python is a programming language."})  # noqa: E501
        assert response.status_code == 200
        assert response.json()["is_plagiarized"] is False

    def test_plagiarism_empty_text(self):
        response = client.post("/api/plagiarism-check", json={"text": "", "reference_text": "Some reference."})
        assert response.status_code == 422


# ── Tone ──────────────────────────────────────────────────────────────────────

class TestTone:
    _tone_result = {
        "tones": [
            {"label": "formal", "score": 0.8},
            {"label": "casual", "score": 0.1},
            {"label": "persuasive", "score": 0.05},
            {"label": "informative", "score": 0.05},
        ],
        "primary_tone": "formal",
    }

    def test_tone_detect_success(self):
        with patch("routers.tone.detect_tone", return_value=self._tone_result):
            response = client.post("/api/tone-detect", json={"text": "We must address this critical issue immediately."})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert data["primary_tone"] == "formal"
        assert len(data["tones"]) == 4

    def test_tone_empty_text(self):
        response = client.post("/api/tone-detect", json={"text": ""})
        assert response.status_code == 422

    def test_tone_service_error(self):
        with patch("routers.tone.detect_tone", side_effect=Exception("zero-shot failed")):
            response = client.post("/api/tone-detect", json={"text": "Some text."})
        assert response.status_code == 500


# ── Co-Writer ─────────────────────────────────────────────────────────────────

class TestCoWriter:
    def test_cowrite_success(self):
        suggestions = [" is a rapidly growing field.", " continues to evolve rapidly.", " shapes the modern economy."]
        with patch("routers.cowriter.generate_suggestions", return_value=suggestions):
            response = client.post("/api/co-write", json={"text": "Artificial intelligence", "max_tokens": 50, "num_suggestions": 3})  # noqa: E501
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) == 3
        assert data["prompt"] == "Artificial intelligence"

    def test_cowrite_empty_text(self):
        response = client.post("/api/co-write", json={"text": "", "max_tokens": 50, "num_suggestions": 3})
        assert response.status_code == 422

    def test_cowrite_invalid_suggestions(self):
        response = client.post("/api/co-write", json={"text": "Hello", "max_tokens": 50, "num_suggestions": 10})
        assert response.status_code == 422

    def test_cowrite_service_error(self):
        with patch("routers.cowriter.generate_suggestions", side_effect=Exception("generation failed")):
            response = client.post("/api/co-write", json={"text": "The future of", "max_tokens": 50, "num_suggestions": 2})  # noqa: E501
        assert response.status_code == 500


# ── Chat ──────────────────────────────────────────────────────────────────────

class TestChat:
    def test_chat_success(self):
        with patch("routers.chat.chat", return_value="AI is a branch of computer science."):
            response = client.post("/api/chat", json={"message": "What is AI?", "mode": "general", "history": []})
        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == "AI is a branch of computer science."
        assert data["mode"] == "general"

    def test_chat_with_history(self):
        history = [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}]
        with patch("routers.chat.chat", return_value="Sure, happy to help!"):
            response = client.post("/api/chat", json={"message": "Can you help me?", "mode": "academic", "history": history})  # noqa: E501
        assert response.status_code == 200

    def test_chat_empty_message(self):
        response = client.post("/api/chat", json={"message": "", "mode": "general", "history": []})
        assert response.status_code == 422

    def test_chat_ollama_unavailable(self):
        with patch("routers.chat.chat", side_effect=RuntimeError("Ollama not reachable")):
            response = client.post("/api/chat", json={"message": "Hello", "mode": "general", "history": []})
        assert response.status_code == 503
