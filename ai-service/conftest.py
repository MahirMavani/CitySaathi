import sys
import os

# Add ai-service root directory to sys.path so 'app' package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Provide safe test token for automated test suite if not configured in environment
if not os.getenv("INTERNAL_AI_SERVICE_TOKEN"):
    os.environ["INTERNAL_AI_SERVICE_TOKEN"] = "test_env_token_for_ci_suite"
