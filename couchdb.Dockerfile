# Build stage for applying security updates
FROM couchdb:3.4.3 AS build

# Update and install security patches
# Use apt-get instead of apt for better script compatibility
# Clean up apt cache to reduce image size
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get dist-upgrade -y && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Production stage
FROM build AS production

# Add Dockerfile Labels
LABEL title="CouchDB with Security Updates"
LABEL description="CouchDB based on official couchdb:3.4.3 image with all security patches applied"
LABEL version="3.4.3"
LABEL maintainer="Vadim Starichkov <starichkovva@gmail.com>"
LABEL license="MIT"
LABEL source="https://github.com/starichkov/nodejs-simple-notes-app.git"
LABEL created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Expose CouchDB port
EXPOSE 5984

# Use the default entrypoint and cmd from the parent image
