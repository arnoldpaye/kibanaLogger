// Html elements
var txtQuery = document.getElementById("txtQuery");
var txtDate = document.getElementById('txtDate');
var divFilter = document.getElementById("divFilter");
var txtFilter = document.getElementById("txtFilter");
var divErrors = document.getElementById("divErrors");
var divErrorsContainer = document.getElementById("divErrorsContainer");
var divReport = document.getElementById("divReport");

// get today date value
var today = new Date();
var todayDate = today.toISOString().split('T')[0];
var todayTime = today.toISOString().split('T')[1];
// set txtDate with today date as default value
txtDate.value = todayDate;

// global exceptions
var globalExceptions = [];

/**
* Search
**/
function search() {
    cleanErrors();
    hideFilter();

    var queryString = buildQueryString();
    var range = queryRange = buildQueryRange();
    KibanaLogger.search(queryString, range.from, range.to, afterSearch);
}

/**
* After search
**/
function afterSearch(exceptions) {
    globalExceptions = exceptions;
    showFilter();
    render(globalExceptions);
}


/**
* Filter
**/
function filter() {
    cleanErrors();

    var filterString = txtFilter.value.trim();
    if(!filterString) filterString = "true";
    
    var predFn = new Function('ro, rs', 'return ('+ filterString +')');

    console.log("FILTER STRING", filterString);
    var filteredExceptions = [];
    globalExceptions.forEach(function(exception) {
        var message = exception._source.message;
        if (typeof message == "object") {
            if (predFn(message, JSON.stringify(message))) {
                filteredExceptions.push(exception);
            }

        }
    });
    render(filteredExceptions);
}

function render(exceptions) {
    var errorsList = document.createElement("ul");
     // just display at most 100 records
    var htmlExceptions = exceptions.slice(0, 100);
    console.log("EXCEPTIONS", exceptions.length);
    console.log("EXCEPTIONS TO DISPLAY", htmlExceptions.length);

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
    divErrors.appendChild(total);
    // *************************************************************************
    divErrors.appendChild(errorsList);
    
    divFilter.setAttribute('style', "display:block;");
}

/**
* Render report
* @param {object} message, exception details.
**/
function renderReport(message) {
    divReport.innerHTML = "";

    // create back link ********************************************************
    var nodeBack = document.createElement("a");
    nodeBack.setAttribute('href', "#");
    nodeBack.setAttribute('onclick', "back()");
    var textBack = document.createTextNode("Atras");
    nodeBack.appendChild(textBack);
    divReport.appendChild(nodeBack);
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
        divReport.appendChild(jjson);
        $('#jjson').jJsonViewer(message, {expanded: true});
    }

    divErrorsContainer.setAttribute('style', "display:none;");
    divReport.setAttribute('style', "display:block;");
}



// UTILS
function buildQueryString() {
    var queryString = txtQuery.value.trim();
    if (queryString === "") queryString = "*";
    return queryString;
}

function buildQueryRange() {
    var to = new Date(txtDate.value.trim() + "T" + todayTime);
    var from = new Date(to.getTime() - 24*60*60*1000);
    return {
        from: from,
        to: to 
    }
}

function cleanErrors() {
    divErrors.innerHTML = "";
}

function hideFilter() {
    divFilter.setAttribute('style', "display:none;");
}

function showFilter() {
    divFilter.setAttribute('style', "display:block;");
}

/**
* Check if message is an object.
**/
function handleMessage(message) {
    if (typeof message === "object") {
        renderReport(message);
    }
}

function back() {
    divErrorsContainer.setAttribute('style', "display:block;");
    divReport.setAttribute('style', "display:none;");
}
