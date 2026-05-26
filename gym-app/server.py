import http.server
import os

os.chdir('/Users/benjaminfleischmann/Downloads/gym-app')

handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(('', 3333), handler)
httpd.serve_forever()
