import os
import sys

class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("========================================")
    print("        STARTING BACKEND SERVICES       ")
    print("========================================")
    print(f"{Colors.RESET}")

def main():
    """
    Main entry point for the backend services.
    This script encapsulates Django's manage.py functionality and defaults
    to running the server if no specific command is provided.
    """
    print_banner()
    print(f"{Colors.CYAN}[INFO]{Colors.RESET} Setting up environment...")

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        print(f"{Colors.RED}{Colors.BOLD}[ERROR]{Colors.RESET} Could not import Django.")
        raise ImportError(
            "Couldn't import Django. Make sure it is installed and "
            "available on your PYTHONPATH environment variable."
        ) from exc

    # Default to running the server if no arguments are passed
    if len(sys.argv) == 1:
        print(f"{Colors.GREEN}{Colors.BOLD}[SUCCESS]{Colors.RESET} Launching server at 0.0.0.0:8000...")
        print(f"{Colors.YELLOW}[NOTE]{Colors.RESET} Press Ctrl+C to stop.")
        # Run server on all interfaces at port 8000
        sys.argv.extend(['runserver', '0.0.0.0:8000'])
    else:
        print(f"{Colors.CYAN}[INFO]{Colors.RESET} Executing command: {' '.join(sys.argv[1:])}")

    print("") # Empty line before logs
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
