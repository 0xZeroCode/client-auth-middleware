'use strict';

var RestClient = require('./restClient');

function mergeUrl(baseUrl, url) {
  if (url === '/') return baseUrl;

  return baseUrl + url;
}

const unauthorizedStatusCode = 401;

class AuthorizationMiddlewareInitializer {
  constructor(authServerHost, authServerPort, currentProjectName, onUnauthorized) {
    this.authServer = {host: authServerHost, port: authServerPort};
    this.projectName = currentProjectName;
    this.logger = console;
    this.client = new RestClient(this.authServer.host, this.authServer.port);
    this.onUnauthorized = onUnauthorized;
  }

  authorizationMiddleware(baseUrl) {
    var thisInitializer = this;
    return function (req, res, next) {
      var actionVerb = req.method.toLowerCase();
      var url = mergeUrl(baseUrl, req.route.path);

      var client = new RestClient(this.authServer.host, this.authServer.port);

      var resourceUrl = '/ActionPermissions/LoginRequired';

      client.post(resourceUrl, {moduleName: thisInitializer.projectName, actionVerb: actionVerb, url: url}, function(result, status) {
        if(status == 500) return res.status(500).send();

        if (result == false) {
          return next();
        }

        if(result.success != undefined && result.success == false)
        {
          return res.send(result);
        }

        authorize();
      });

      function authorize() {
        var tokenHeader = req.get('Authorization');

        client.post('/Authorization', {
          token: tokenHeader,
          action: {url: url, actionVerb: actionVerb, moduleName: thisInitializer.projectName}
        }, function (result, status) {
          if (status === unauthorizedStatusCode && this.onUnauthorized) {
            return this.onUnauthorized();
          }
          if (!result) return res.status(status).send();
          if (!result.success) return res.send(result);
          next();
        });
      }
    };
  }

  registerNewRoutes(router, baseUrl) {
    this.logger.log('register routes');
    var routes = router.stack.map(function (middleware) {
      return middleware.route;
    });

    var client = new RestClient(this.authServer.host, this.authServer.port);

    var thisInitializer = this;

    routes.forEach(function (route) {
      if (!route) return;

      var url = mergeUrl(baseUrl, route.path);

      Object.keys(route.methods).forEach(function (key) {
        if (!route.methods[key]) return;

        client.post('/ActionPermissions/newAction', {
          action: {url: url, actionVerb: key, moduleName: thisInitializer.projectName}
        }, function (result, status) {
          if (!result || !result.success) {
            thisInitializer.logger.error('status: ' + status + '.\nresult: ' + result + '\n');
          }
        });
      });
    });
  }

}


module.exports = function (authServerHost, authServerPort, currentProjectName, onUnauthorized) {
  return new AuthorizationMiddlewareInitializer(authServerHost, authServerPort, currentProjectName, onUnauthorized);
};
