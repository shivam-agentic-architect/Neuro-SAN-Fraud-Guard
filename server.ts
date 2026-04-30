import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Neuro SAN Fraud Guard" });
  });

  // Mock Agent Orchestration Endpoint
  app.post("/api/run-fraud-analysis", async (req, res) => {
    const { transactionData } = req.body;
    
    console.log("Starting Neuro SAN multi-agent analysis for transaction:", transactionData.id);
    
    // Simulating high-fidelity response from the Python backend (backend/main.py)
    setTimeout(() => {
      res.json({
        success: true,
        id: "anl_" + Math.random().toString(36).substr(2, 9),
        transactionId: transactionData.id,
        riskScore: 84.2,
        reasoning: "Analysis via Neuro SAN multi-agent orchestration. AAOSA protocol reconciliation completed. Critical spatial anomaly: User located in " + transactionData.location + " but behavioral markers suggest compromised device activity originating from remote endpoint.",
        trace: [
          { agent: "Transaction Analyzer", step: "Data Extraction", output: "Extracted location: " + transactionData.location + ", amount: $" + transactionData.amount + ". Anomalous currency conversion detected." },
          { agent: "Fraud Pattern Detector", step: "Pattern Match", output: "Behavioral signature matches 'Identity Poisoning' template (Probability: 0.92)." },
          { agent: "Risk Scoring Agent", step: "Vector Inference", output: "Risk weighted score: 84.2. Primary factor: Travel velocity inconsistency." },
          { agent: "Compliance Validator", step: "RAG Policy Check", output: "Policy 7.2.1 match: Cross-border volume exceeds regional thresholds for verified status." },
          { agent: "Report Generator", step: "Final Synthesis", output: "Full explainable report generated. Recommending manual terminal review." }
        ]
      });
    }, 2500);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
