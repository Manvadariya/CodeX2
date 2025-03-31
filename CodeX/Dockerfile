FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for multiple languages
RUN apt-get update && \
    apt-get install -y build-essential openjdk-17-jdk python3 python3-pip nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh

ENTRYPOINT ["/app/run.sh"] 