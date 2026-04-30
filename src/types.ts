export interface Transaction {
  id: string;
  amount: number;
  location: string;
  timestamp: string;
  merchant: string;
  status: 'pending' | 'flagged' | 'safe';
  userId: string;
}

export interface AgentStep {
  agent: string;
  step: string;
  output: string;
  duration?: number;
}

export interface AnalysisResult {
  id: string;
  transactionId: string;
  riskScore: number;
  reasoning: string;
  agentTrace: AgentStep[];
  timestamp: string;
  status: 'review_required' | 'approved' | 'rejected';
}
