const http = require('http');

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
  // Setting the Content-Type header for JSON response
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/success') {
    // 200 OK status for the /success route
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Request was successful' }));
  } else if (req.url === '/error') {
    // 500 Internal Server Error status for the /error route
    res.statusCode = 500;
    res.end(JSON.stringify({ message: 'Internal Server Error' }));
  } else {
    // 404 Not Found for any other route
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'Resource not found' }));
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
