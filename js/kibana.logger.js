/*((){})();*/
var KibanaLogger = (function() {

    var ELASTIC_SEARCH_HOST = "http://172.20.17.80:9200/";

    /**
    * Create elastic query.
    * @param {string} queryString
    * @param {number/timestamp} from
    * @param {number/timestamp} to
    * @return {object}
    **/
    var createElasticQuery = function(queryString, from, to) {
        return {
            "query": {
                "query_string": {"query": queryString }
            },
            "filter": {
                "range": {
                    "@timestamp": {"from": from, "to": to }
                }
            },
            "sort": {
                "@timestamp": {"order": "desc"}
            },
            "size": 500
        };
    };

    /**
    * Create elastic url.
    * @param {number/timestamp} date
    * @param {object} query
    * @return {string}
    **/
    var createElasticUrl = function(date, query) {
        return ELASTIC_SEARCH_HOST + "logstash-" + formatDate(date) + "/_search?source=" + JSON.stringify(query);
    };

    /**
    * @param {string} method
    * @param {string} url
    * @retur {Promise}
    **/
    var getPromisedRequest = function(method, url) {
        var promise = new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.onload = function() {
                console.log("onload");
            };

            xhr.onerror = function() {
                // TODO: reject it
                console.log("onerror");
            };

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var response = JSON.parse(xhr.responseText);
                        resolve(response.hits.hits);
                    } else {
                        reject(Error(xhr.statusText));
                    }
                }
            };

            xhr.open(method, url);
            xhr.send();
        });
        return promise;
    };

    /**
    * Given a date return a formatted string as: "YYYY.mm.dd",
    * for example: "2015.11.03"
    * @param {object} date
    * @return {string}
    **/
    var formatDate = function(date) {
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        month = month + 1;
        if (month < 10) month = "0" + month;
        if (day < 10) day = "0" + day;
        return year + "." + month + "." + day;
    };

    return {
        /**
        *
        * @param {string} queryString
        * @param {number/timestamp} from
        * @param {number/timestamp} to
        * @param callback
        */
        search: function(queryString, from, to, callback) {
            var elasticQuery = createElasticQuery(queryString, from, to);
            var fromUrl = createElasticUrl(from, elasticQuery);
            var toUrl = createElasticUrl(to, elasticQuery);
            var exceptions = [];
            
            var fromErrors = getPromisedRequest('GET', fromUrl);
            var toErrors = getPromisedRequest('GET', toUrl);
            fromErrors.then(function(records) {
                //console.log("total from", records.length);
                exceptions = exceptions.concat(records);
                toErrors.then(function(records) {
                    //console.log("total to", records.length);
                    exceptions = exceptions.concat(records);
                    console.log("TOTAL EXCEPTIONS", exceptions.length);

                    // Try to convert message property to an object
                    // TODO: this should be done with a fuction
                    exceptions.forEach(function(exception) {
                        if (exception._source.message) {
                            var message = exception._source.message;
                            try {
                                exception._source.message = JSON.parse(message);
                            } catch (e) {
                                console.log(e, exception._source.message);
                            }
                        } else {
                            console.log("The exception doesn't have a message property.");
                        }
                    });
                    callback(exceptions);
                });
            });
        }
    };
})();
