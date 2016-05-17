var http = require("http");

function RestClient(host, port) {
    this.host = host;
    this.port = port;

    this.post = function (path, requestBody, callback) {
        var options = {
            host: this.host,
            port: this.port,
            path: path,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
        };

        var request = http.request(options, function (response) {
            var body = '';

            response.on('data', function (chunk) {
              body += chunk;
            });

			      response.on('error', function (err) {
				      console.error('RequestError', err);
			      });

            response.on('end', function () {
              if (!body) {
                return callback(null, response.statusCode);
              }
              
              var result = JSON.parse(body);

              callback(result, response.statusCode);
            });

        });

		    request.on('error', function(err) {
			    console.error(err);
		    });

        request.write(JSON.stringify(requestBody));
        request.end();
    };
}

module.exports = RestClient;
