from http.server import BaseHTTPRequestHandler, HTTPServer
MESSAGE = "baseline"
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = "ok" if self.path == "/health" else MESSAGE
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body.encode())
    def log_message(self, *args): pass
if __name__ == "__main__": HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
