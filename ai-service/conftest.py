import sys
import os

# Add ai-service root directory to sys.path so 'app' package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
