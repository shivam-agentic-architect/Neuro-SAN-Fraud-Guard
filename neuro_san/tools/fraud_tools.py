import json
from typing import Dict, Any

def data_extractor(raw_data: str) -> Dict[str, Any]:
    """
    Tool for Transaction Analyzer Agent.
    Extracts structured fields from raw unstructured transaction logs.
    """
    # Logic to parse raw data using regex or LLM-based structured extraction
    try:
        # Simulate extraction logic
        structured_data = {
            "amount": 0.0,
            "merchant": "Unknown",
            "location": "Remote",
            "is_anomaly": False
        }
        # In real scenario, logic to populate above goes here
        return structured_data
    except Exception as e:
        return {"error": str(e)}

def risk_calculator(features: Dict[str, Any]) -> float:
    """
    Tool for Risk Scoring Agent.
    Calculates numerical risk score based on extracted features.
    """
    score = 0.0
    if features.get("amount", 0) > 5000:
        score += 40
    if features.get("location") == "Unknown":
        score += 30
    return min(score, 100.0)
