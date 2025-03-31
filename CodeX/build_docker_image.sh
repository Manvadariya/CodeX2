#!/bin/bash

# Build the Docker image for code execution
echo "Building Docker image for code execution..."
docker build -t code_execution_env .

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Docker image built successfully!"
else
    echo "Error building Docker image."
    exit 1
fi 