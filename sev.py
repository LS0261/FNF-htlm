import os
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer

class MyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/list_songs":
            songs = set()
            weeks_dir = "weeks"
            for file in os.listdir(weeks_dir):
                if file.endswith(".json"):
                    with open(os.path.join(weeks_dir, file), "r") as f:
                        week_data = json.load(f)
                        if "songs" in week_data:
                            for song_entry in week_data["songs"]:
                                if isinstance(song_entry, list) and len(song_entry) > 0:
                                    songs.add(song_entry[0].lower())
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(sorted(list(songs))).encode())
        else:
            super().do_GET()

PORT = 8000
httpd = HTTPServer(('', PORT), MyHandler)
print(f"Serving on http://localhost:{PORT}")
httpd.serve_forever()