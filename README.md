# Neuro SAN Fraud Guard

Production-grade multi-agent AI system for fraud detection and risk scoring, powered by Neuro SAN Studio architecture and the AAOSA protocol.

## System Architecture

The system utilizes a **Multi-Agent Network** orchestrated via the Neuro SAN Studio runtime.

1.  **Transaction Analyzer Agent**: Parses raw ingestion data.
2.  **Fraud Pattern Detector Agent**: Runs heuristic and reasoning blocks.
3.  **Risk Scoring Agent**: Quantifies fraud probability.
4.  **Compliance Validator Agent**: Cross-references against AML/KYC policies (RAG).
5.  **Report Generator Agent**: Synthesizes the master audit trail.

## Tech Stack
- **Backend**: Node.js/Express (Orchestration Simulation), Python (Tools/Neuro SAN)
- **Frontend**: React 19, Tailwind CSS, Recharts
- **Database**: Firebase Firestore
- **AI**: Gemini 3.1 Pro / Flash

## Setup Instructions

1.  **Clone Neuro SAN Studio**:
    ```bash
    git clone https://github.com/cognizant-ai-lab/neuro-san-studio.git
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    # Python deps
    pip install neuro-san-sdk fastapi pydantic
    ```
3.  **Configuration**:
    Update `neuro_san/configs/agents.conf` with your LLM API keys.
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Multi-Agent Communication (AAOSA)
Agents communicate using the AAOSA (Agentic Adaptive Open System Architecture) protocol, allowing for dynamic delegation and self-healing orchestration within the Neuro SAN ecosystem.
