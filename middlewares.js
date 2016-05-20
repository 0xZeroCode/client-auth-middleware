'use strict';

var RestClient = require('./restClient');

function mergeUrl(baseUrl, url) {
  if (url === '/') return baseUrl;

  return baseUrl + url;
}

class AuthorizationMiddlewareInitializer {
  constructor(authServerHost, authServerPort, currentProjectName) {
    this.authServer = {host: authServerHost, port: authServerPort};
    this.projectName = currentProjectName;
  }

  middlewareByAction(url, actionVerb) {
    var thisInitializer = this;
    return function (req, res, next) {
      var client = new RestClient(thisInitializer.authServer.host, thisInitializer.authServer.port);

      var resourceUrl = '/ActionPermissions/' + thisInitializer.projectName + '/' + actionVerb + '/' + url + '/LoginRequired';

      client.get(resourceUrl, function(result) {
        if (!result) {
          return next();
        }

        authorize();
      });

      function authorize() {
        var tokenHeader = req.get('Authorization');

        client.post('/Authorization', {
          token: tokenHeader,
          action: {url: url, actionVerb: actionVerb, moduleName: thisInitializer.projectName}
        }, function (result, status) {
          if (!result) return res.status(status).send();
          if (!result.success) return res.send(result);
          next();
        });
      }
    };
  }

  initializeAuthorizationMiddlewares(router, dictionary, baseUrl) {
    var thisInitializer = this;
    for (var verb in dictionary) {
      dictionary[verb].forEach(function (url) {
        router[verb](url, thisInitializer.middlewareByAction(mergeUrl(baseUrl, url), verb)); //router[verb], e.g router['get'] is same as router.get
      });
    }
  }
}


module.exports = function (authServerHost, authServerPort, currentProjectName) {
  return new AuthorizationMiddlewareInitializer(authServerHost, authServerPort, currentProjectName);
};
