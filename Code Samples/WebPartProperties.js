//pass in the web part ID as a string (guid)
function getWebPartProperties(wpId) {
    var dfd = $.Deferred();

    //get the client context
    var clientContext =
        new SP.ClientContext(_spPageContextInfo.webServerRelativeUrl);
    //get the current page as a file
    var oFile = clientContext.get_web()
        .getFileByServerRelativeUrl(_spPageContextInfo.serverRequestPath);
    //get the limited web part manager for the page
    var limitedWebPartManager =
        oFile.getLimitedWebPartManager(SP.WebParts.PersonalizationScope.shared);
    //get the web parts on the current page
    var collWebPart = limitedWebPartManager.get_webParts();

    //request the web part collection and load it from the server
    clientContext.load(collWebPart);
    clientContext.executeQueryAsync(Function.createDelegate(this, function () {
        var webPartDef = null;
        //find the web part on the page by comparing ID's
        for (var x = 0; x < collWebPart.get_count() && !webPartDef; x++) {
            var temp = collWebPart.get_item(x);
            if (temp.get_id().toString() === wpId) {
                webPartDef = temp;
            }
        }
        //if the web part was not found
        if (!webPartDef) {
            dfd.reject("Web Part: " + wpId + " not found on page: "
                + _spPageContextInfo.webServerRelativeUrl);
            return;
        }

        //get the web part properties and load them from the server
        var webPartProperties = webPartDef.get_webPart().get_properties();
        clientContext.load(webPartProperties);
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve(webPartProperties, webPartDef, clientContext);
        }), Function.createDelegate(this, function () {
            dfd.reject("Failed to load web part properties");
        }));
    }), Function.createDelegate(this, function () {
        dfd.reject("Failed to load web part collection");
    }));

    return dfd.promise();
}

//pass in the web part ID and a JSON object with the properties to update
function saveWebPartProperties(wpId, obj) {
    var dfd = $.Deferred();

    getWebPartProperties(wpId).done(
        function (webPartProperties, webPartDef, clientContext) {
        //set web part properties
        for (var key in obj) {
            webPartProperties.set_item(key, obj[key]);
        }
        //save web part changes
        webPartDef.saveWebPartChanges();
        //execute update on the server
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve();
        }), Function.createDelegate(this, function () {
            dfd.reject("Failed to save web part properties");
        }));
    }).fail(function (err) { dfd.reject(err); });

    return dfd.promise();
}