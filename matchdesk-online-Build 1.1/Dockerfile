# Playwright's official image already contains Chromium and its system libraries
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy
WORKDIR /app
RUN pip install --no-cache-dir requests pywebpush playwright==1.49.0
COPY . .
ENV HOME=/tmp
EXPOSE 8080
CMD ["python", "server.py"]
