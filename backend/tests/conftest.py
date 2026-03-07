"""
pytest configuration: stub out heavy ML libraries before importing the app,
so tests can run without torch / transformers / sentencepiece installed.
"""

import sys
from unittest.mock import MagicMock

# ── Stub heavy ML / native libraries ─────────────────────────────────────────
_STUBS = [
    "torch",
    "numpy",
    "numpy.linalg",
    "transformers",
    "transformers.pipelines",
    "sentencepiece",
    "accelerate",
    "sklearn",
    "sklearn.metrics",
    "sklearn.metrics.pairwise",
]

for _mod in _STUBS:
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()
