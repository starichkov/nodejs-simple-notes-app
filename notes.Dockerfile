FROM node:22.16-alpine3.21

# Install wget for health checks
RUN apk add --no-cache wget

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json if they exist
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the application code to the container
COPY src/notes-api-server.js .
COPY src/public ./public
COPY src/db ./db
COPY src/models ./models
COPY src/routes ./routes

# Expose the port the Express server will run on
EXPOSE 3000

# Define the command to run the Node.js server
CMD ["node", "notes-api-server.js"]