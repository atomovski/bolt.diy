FROM node:20

# Create user and set permissions
RUN useradd -m -s /bin/bash user || true
WORKDIR /home/project

# Fix permissions  
RUN chown -R user:user /home/project
USER user