FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN go build -o /out/cosigner .

FROM alpine:3.21
RUN adduser -D -u 10001 cosigner
USER cosigner
WORKDIR /app
COPY --from=build /out/cosigner /app/cosigner
EXPOSE 9191
ENTRYPOINT ["/app/cosigner"]
CMD ["-config", "/app/cosigner.json"]
