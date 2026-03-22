FROM nvcr.io/nvidia/tritonserver:24.09-py3

WORKDIR /app

EXPOSE 8000
EXPOSE 8001
EXPOSE 8002

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt --no-cache-dir

CMD [ "tritonserver", "--model-repository=/models" ]