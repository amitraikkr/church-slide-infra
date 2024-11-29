# Use Amazon Linux 2023 with Python 3.11
FROM public.ecr.aws/lambda/python:3.11

# Copy the function code and dependencies into the container
COPY app.py ${LAMBDA_TASK_ROOT}
COPY requirements.txt .

# Install dependencies
RUN pip install -r requirements.txt -t ${LAMBDA_TASK_ROOT}

# Set the command to invoke the Lambda function handler
CMD ["app.handler"]
