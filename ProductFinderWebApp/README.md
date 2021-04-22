## Getting started
### Starting the web application
Start the application using Python >=3.8.6:
```bash
# Create virtual environment
py -3 -m venv .venv

# Activate virtual environment
.venv\scripts\activate

# Update pip version
.venv\scripts\python.exe -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Run the server (Windows)
flask run

# Run the server (Linux)
gunicorn --bind=0.0.0.0 --workers=4 --timeout 900 app:app
```