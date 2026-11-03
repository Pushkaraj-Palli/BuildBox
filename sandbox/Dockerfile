FROM node:22-alpine

RUN addgroup -S -g 10001 sandbox && adduser -S -u 10001 -G sandbox sandbox

WORKDIR /opt/buildbox-sandbox
COPY package.json ./package.json
RUN npm install --ignore-scripts --no-audit --no-fund
RUN chown -R 10001:10001 /opt/buildbox-sandbox

USER 10001:10001
