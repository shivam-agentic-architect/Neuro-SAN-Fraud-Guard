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
- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide Icons, Framer Motion
- **Database**: Firebase Firestore
- **AI**: Gemini 2.0 Flash (via Google AI SDK)

## Setup Instructions

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configuration**:
    Ensure you have a `firebase-applet-config.json` in the root directory.
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Multi-Agent Communication (AAOSA)
Agents communicate using the AAOSA (Agentic Adaptive Open System Architecture) protocol, allowing for dynamic delegation and self-healing orchestration within the Neuro SAN ecosystem.
