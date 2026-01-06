# Build stage for applying security updates
FROM couchdb:3.5.1 AS build

# Update and install security patches
# Clean up apt cache to reduce image size
RUN apt update && \
    apt-mark hold couchdb && \
    DEBIAN_FRONTEND=noninteractive apt upgrade -y -o Dpkg::Options::="--force-confold" && \
    DEBIAN_FRONTEND=noninteractive apt full-upgrade -y -o Dpkg::Options::="--force-confold" && \
    apt autoremove -y && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Production stage
FROM build AS production

# Add Dockerfile Labels
LABEL title="CouchDB with Security Updates"
LABEL description="CouchDB based on official couchdb:3.5.1 image with all security patches applied"
LABEL version="3.5.1"
LABEL maintainer="Vadim Starichkov <starichkovva@gmail.com>"
LABEL license="MIT"
LABEL source="https://github.com/starichkov/nodejs-simple-notes-app.git"
LABEL created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Expose CouchDB port
EXPOSE 5984

# Use the default entrypoint and cmd from the parent image
