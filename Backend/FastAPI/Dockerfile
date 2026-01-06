FROM python:3.14-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN python -m pip install --no-cache-dir --upgrade pip && \
    python -m pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./main.py /code/main.py

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
