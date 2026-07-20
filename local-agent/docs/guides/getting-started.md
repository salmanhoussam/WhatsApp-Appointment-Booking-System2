# Getting Started

## One-time setup

1. Install [Ollama](https://ollama.com), then `ollama serve`.
2. Pull a tool-calling-capable model: `ollama pull qwen2.5:7b` (or any model you prefer — `llama3.1:8b`, `qwen2.5:3b`, ...). **Whatever you pull, set `OLLAMA_MODEL` to match it** if it's not `qwen2.5:7b` (the default in `config/settings.py`), or every request fails with `status="llm_error"`.
3. ```bash
   cd local-agent
   python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
4. `python main.py` — serves on `http://127.0.0.1:8010`.
5. `curl -X POST localhost:8010/agent/setup -H "Content-Type: application/json" -d '{}'` — creates the local schema.

## First real request

```bash
curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "add customer Ahmad, phone 03123456"}'
```

The **first** request after Ollama loads the model can take minutes on modest hardware — that's one-time model loading, not a hang. Subsequent requests are much faster (single-digit to low-teens seconds observed on a weak GPU with a 3B model). Watch `logs/events.log` (`tail -f logs/events.log`) to see the Job # trace as it happens — see [../architecture/logging.md](../architecture/logging.md).

## Try more

See the root [`README.md`](../../README.md)'s "Try it" section for the full curl example set (products, invoices, listing, catalog import/search).
