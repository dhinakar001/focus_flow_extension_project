# FocusFlow Python Summarizer

FastAPI microservice that powers FocusFlow's meeting and session recap summaries using Hugging Face Transformers.

## Features
- BART `facebook/bart-large-cnn` text summarization
- Input sanitization and validation
- GPU acceleration when available
- Single, reusable model instance loaded at startup
- Timeout protection for every request
- CORS enabled for `http://localhost:3000` and `http://localhost:4000`

## Project Structure
```
python-summarizer/
├── app.py
├── requirements.txt
├── models/
│   └── summarizer.py
├── services/
│   └── summary_service.py
├── utils/
│   └── cleaner.py
└── README.md
```

## Getting Started
1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
2. **Run the API**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

## API
### `POST /summarize`
Request body:
```json
{
  "text": "Your long-form content..."
}
```
Constraints:
- Text must not be empty
- Minimum length: 30 characters

Successful response:
```json
{
  "summary": "Condensed text...",
  "length": 123,
  "compression_ratio": 0.42
}
```

## Notes
- The service automatically picks GPU `cuda:0` if present, otherwise it falls back to CPU.
- Summaries are limited to approximately 180 tokens to balance latency and readability.
- Timeout errors yield `504` responses so clients can retry gracefully.


