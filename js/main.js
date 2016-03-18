// Html elements
var txtQuery = document.getElementById("txtQuery");
var txtDate = document.getElementById("txtDate");
var divFilter = document.getElementById("divFilter");
var txtFilter = document.getElementById("txtFilter");
var divErrors = document.getElementById("divErrors");
var divErrorsContainer = document.getElementById("divErrorsContainer");
var divReport = document.getElementById("divReport");

// Dates
var today = new Date();
var yesterday = new Date(today.getTime() - 24*60*60*1000);

var toDate = today.toISOString().split('T')[0];
var toTime = today.toISOString().split('T')[1];
var fromDate = yesterday.toISOString().split('T')[0];
var fromTime = yesterday.toISOString().split('T')[1];

// set txtToDate with today date as default value
txtToDate.value = toDate;
// set txtFromDate with yesterday date as default value
txtFromDate.value = fromDate;

// global exceptions
var exceptions = [];

/**
* Search
**/
function search() {
    cleanErrors();
    hideFilter();

    var queryString = buildQueryString();
    var range = buildQueryRange(1);
    KibanaLogger.search(queryString, range.from, range.to, preRender);
}

/**
* Set exceptions
* @param {object} es
**/
function preRender(es) {
    exceptions = es;
    showFilter();
    render(exceptions);
}

/**
* Filter
**/
function filter() {
    cleanErrors();

    var predFn = buildPredicateFunction();

    var filteredExceptions = [];
    exceptions.forEach(function(exception) {
        var message = exception._source.message;
        if (typeof message == "object") {
            if (predFn(message, JSON.stringify(message))) {
                filteredExceptions.push(exception);
            }
        }
    });
    render(filteredExceptions);
}

/**
* Render
* @param {object} exceptions
**/
function render(exceptions) {
    var errorsList = document.createElement("ul");
     // just display at most 100 records
    var htmlExceptions = exceptions.slice(0, 100);
    console.log("EXCEPTIONS", exceptions.length);
    console.log("EXCEPTIONS TO DISPLAY", htmlExceptions.length);

    htmlExceptions.forEach(function(exception) {
        var source = exception._source;
        var node = document.createElement("li");
        var linkNode = buildLinkNode(source);
        node.appendChild(linkNode);
        errorsList.appendChild(node);
    });

    addTotalCounter(htmlExceptions);
    divErrors.appendChild(errorsList);
    showFilter();
}

/**
* Render report
* @param {object} message, exception details.
**/
function renderReport(message) {
    cleanReport();

    var nodeBack = buildBackNode();
    divReport.appendChild(nodeBack);

    var asTable = false;
    if (asTable) {
        // test json.human.js
        var rpt = JsonHuman.format(message);
        divReport.appendChild(rpt);
    } else {
        // test jjsonviewer.js
        var jjson = document.createElement("div");
        jjson.setAttribute('id', "jjson");
        jjson.setAttribute('class', "jjson");
        divReport.appendChild(jjson);
        $('#jjson').jJsonViewer(message, {expanded: true});
    }

    hideErrorsContainer();
    showReport();
}


// UTILS ***********************************************************************
function buildQueryString() {
    var queryString = txtQuery.value.trim();
    if (queryString === "") queryString = "*";
    return queryString;
}

function buildQueryRange() {
    var to = new Date(txtToDate.value.trim() + "T" + toTime);
    var from = new Date(txtFromDate.value.trim() + "T" + fromTime);
    return {
        from: from,
        to: to 
    };
}

function buildPredicateFunction() {
    var filterString = txtFilter.value.trim();
    if(!filterString) filterString = "true";
    
    return new Function('ro, rs', 'return ('+ filterString +')');
}

function buildLinkNode(source) {
    var text;
    var link;
    if (source.message) {
            if (typeof source.message == "object") {
            text = "("+ source["@timestamp"] + ") " + source.message.Details.Error.Message;
            link = document.createElement('a');
            link.setAttribute('href', "#");
            link.setAttribute('onclick', "handleMessage(" + JSON.stringify(source.message) + ")");
            var textNode = document.createTextNode(text);
            link.appendChild(textNode);
        } else {
            text = source.message;
            link = document.createTextNode(text);
        }
    } else if (source.requestpayload) {
        text = source.requestpayload;
        link = document.createTextNode(text);
    }
    return link;
}

function buildBackNode() {
    var back = document.createElement("a");
    back.setAttribute('href', "#");
    back.setAttribute('onclick', "back()");
    var textBack = document.createTextNode("Atras");
    back.appendChild(textBack);
    return back;
}

function addTotalCounter(htmlExceptions) {
    var total = document.createElement("div");
    var textTotal  = document.createTextNode(htmlExceptions.length + " of " + exceptions.length);
    total.appendChild(textTotal);
    divErrors.appendChild(total);
}

function hideErrorsContainer() {
    divErrorsContainer.setAttribute('style', "display:none;");
}

function cleanErrors() {
    divErrors.innerHTML = "";
}

function cleanReport() {
    divReport.innerHTML = "";
}

function showReport() {
    divReport.setAttribute('style', "display:block;");
}

function hideFilter() {
    divFilter.setAttribute('style', "display:none;");
}

function showFilter() {
    divFilter.setAttribute('style', "display:block;");
}

function handleMessage(message) {
    if (typeof message === "object") {
        renderReport(message);
    }
}

function back() {
    divErrorsContainer.setAttribute('style', "display:block;");
    divReport.setAttribute('style', "display:none;");
}
