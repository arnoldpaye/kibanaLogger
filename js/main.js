/* ELASTIC SEARCH NON PRODUCTION ENVIRONMENT */
var elasticSearchHost = "http://172.20.17.80:9200/";

/**
* Create query.
* @param {string} queryString
* @param {number/timestamp} from
* @param {number/timestamp} to
**/
function createQuery(queryString, from, to) {
    return {
        "query": {
            "query_string": {
                "query": queryString
            }
        },
        "filter": {
            "range": {
                "@timestamp": {
                    "from": from,
                    "to": to
                }
            }
        },
        "sort": {
            "@timestamp": {
                "order": "desc"
            }
        },
        "size": 500
    }
}

// global exceptions array
var exceptions = [];
/**
* Search.
*/
function search() {
    //var queryString = 'application:"ST7" AND environment:\"qa1\" AND type:\"jsexception\"'
    var queryString = document.getElementById("txtQuery").value;
    // clean exceptions
    exceptions = [];
    var errors = document.getElementById("divErrors");
    var filter = document.getElementById("divFilter");
    errors.innerHTML = "";
    filter.setAttribute('style', "display:none;");

    queryString = queryString.trim();
    if (queryString === "") queryString = "*";

    console.log("queryString", queryString);

    // build urls **************************************************************
    var today = new Date();
    var yesterday = new Date(today.getTime() - 24*60*60*1000);
    var query = createQuery(queryString, yesterday.getTime(), today.getTime());

    var todayUrl = elasticSearchHost + "logstash-" + formatDate(today) + "/_search?source=" + JSON.stringify(query);
    var yerderdayUrl = elasticSearchHost + "logstash-" + formatDate(yesterday) + "/_search?source=" + JSON.stringify(query);
    // *************************************************************************

    var todayErrors = promisedRequest('GET', todayUrl);
    var yesterdayErrors = promisedRequest('GET', yerderdayUrl);

    todayErrors.then(function(records) {
        console.log("total today", records.length);
        exceptions = exceptions.concat(records);
        yesterdayErrors.then(function(records) {
            console.log("total yesterday", records.length);
            exceptions = exceptions.concat(records);
            console.log("total errors", exceptions.length);

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

            renderExceptions(exceptions);
        });
    })
}


/**
* Filter
*/
function filter() {
    var txtFilter = document.getElementById("txtFilter").value;
    txtFilter = txtFilter.trim();
    var evaluation = "message" + "." + txtFilter;
    if (txtFilter) {
        console.log("text filter", txtFilter);
        var filteredExceptions = [];
        exceptions.forEach(function(exception) {
            var message = exception._source.message;
            if (typeof message == "object") {
                if (eval(evaluation)) {
                    filteredExceptions.push(exception);
                }
            }
        });
        renderExceptions(filteredExceptions);
    } else if (txtFilter == "") {
        renderExceptions(exceptions);
    }
}

/**
* Check if message is an object.
*/
function handleMessage(message) {
    if (typeof message === "object") {
        renderReport(message);
    }
}

/**
* Render report
* @param {object} message, exception details.
*/
function renderReport(message) {
    var errorsContainer = document.getElementById("divErrorsContainer");
    var report = document.getElementById("report");
    // clean report
    report.innerHTML = "";

    // create back link ********************************************************
    var nodeBack = document.createElement("a");
    nodeBack.setAttribute('href', "#");
    nodeBack.setAttribute('onclick', "back()");
    var textBack = document.createTextNode("Atras");
    nodeBack.appendChild(textBack);
    report.appendChild(nodeBack);
    // *************************************************************************

    var asTable = false;
    if (asTable) {
        // test json.human.js
        var rpt = JsonHuman.format(message);
        report.appendChild(rpt);
    } else {
        // test jjsonviewer.js
        var jjson = document.createElement("div");
        jjson.setAttribute('id', "jjson");
        jjson.setAttribute('class', "jjson");
        report.appendChild(jjson);
        $('#jjson').jJsonViewer(message, {expanded: true});
    }

    errorsContainer.setAttribute('style', "display:none;");
    report.setAttribute('style', "display:block;");
}

function back() {
    var errorsContainer = document.getElementById("divErrorsContainer");
    var report = document.getElementById("report");
    errorsContainer.setAttribute('style', "display:block;");
    report.setAttribute('style', "display:none;");
}

/**
* Render html for exceptions.
* @param {Array} exceptions
* {
    "id":,
    "_index":,
    "score":,
    "_source":,
    "type":,
    "sort":
  }
*/
function renderExceptions(exceptions) {
    var errors = document.getElementById("divErrors");
    var filter = document.getElementById("divFilter");
    errors.innerHTML = "";
    var errorsList = document.createElement("ul");

    // just display at most 100 records
    var htmlExceptions = exceptions.slice(0, 100);
    console.log("exceptions", exceptions.length);
    console.log("exceptions to display", htmlExceptions.length);

    htmlExceptions.forEach(function(exception) {
        var source = exception._source;
        var node = document.createElement("li");

        var text;
        var linkNode;
        if (source.message) {
                if (typeof source.message == "object") {
                text = source.message.Details.Error.Message;
                // create error link ***********************************************
                linkNode = document.createElement('a');
                linkNode.setAttribute('href', "#");
                linkNode.setAttribute('onclick', "handleMessage(" + JSON.stringify(source.message) + ")");
                // *****************************************************************
                var textNode = document.createTextNode(text);
                linkNode.appendChild(textNode);
            } else {
                text = source.message;
                linkNode = document.createTextNode(text);
            }
        } else if (source.requestpayload) {
            text = source.requestpayload;
            linkNode = document.createTextNode(text);
        }

        node.appendChild(linkNode);
        errorsList.appendChild(node);
    });

    // add total counter *******************************************************
    var total = document.createElement("div");
    var textTotal  = document.createTextNode(htmlExceptions.length + " of " + exceptions.length);
    total.appendChild(textTotal);
    errors.appendChild(total);
    // *************************************************************************
    errors.appendChild(errorsList);
    
    filter.setAttribute('style', "display:block;");
}

/**
* @param {string} method
* @param {string} url
*/
function promisedRequest(method, url) {
    var promise = new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.onload = function() {
            console.log("onload");
        };

        xhr.onerror = function() {
            // TODO: reject it
            console.log("onerror");
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    resolve(response.hits.hits);
                } else {
                    reject(Error(xhr.statusText));
                }
            }
        }

        xhr.open(method, url);
        xhr.send();
    });
    return promise;
}

/**
* Given a date return a formatted string as: "YYYY.mm.dd",
* for example: "2015.11.03"
*/
function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var day = date.getDate();
    month = month + 1;
    if (month < 11) month = "0" + month;
    if (day < 10) day = "0" + day;
    return year + "." + month + "." + day;
}
