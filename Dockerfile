# Use the base image from subquerynetwork
FROM subquerynetwork/subql-node-cosmos:v3.8.1

# Copy the necessary files into the image
RUN mkdir /app
COPY project.yaml /app/project.yaml
COPY schema.graphql /app/schema.graphql
COPY dist /app/dist
COPY proto /app/proto

# Expose the port the app runs on
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/lib/node_modules/@subql/node-cosmos/bin/run"]

CMD ["-f=/app", "--db-schema=app"]
