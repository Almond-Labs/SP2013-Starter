function getWebPartProperties(wpId) {
    var dfd = $j.Deferred();

    var clientContext = new SP.ClientContext(_spPageContextInfo.webServerRelativeUrl);
    var oFile = clientContext.get_web().getFileByServerRelativeUrl(_spPageContextInfo.serverRequestPath);
    var limitedWebPartManager = oFile.getLimitedWebPartManager(SP.WebParts.PersonalizationScope.shared);
    var collWebPart = limitedWebPartManager.get_webParts();

    clientContext.load(collWebPart);
    clientContext.executeQueryAsync(Function.createDelegate(this, function () {
        var webPartDef = null;
        for (var x = 0; x < collWebPart.get_count() && !webPartDef; x++) {
            var temp = collWebPart.get_item(x);
            if (temp.get_id().toString() === wpId) {
                webPartDef = temp;
            }
        }
        if (!webPartDef) {
            dfd.reject("Web Part: " + wpId + " not found on page: " + _spPageContextInfo.webServerRelativeUrl);
            return;
        }

        var webPartProperties = webPartDef.get_webPart().get_properties();
        clientContext.load(webPartProperties);
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve(webPartProperties, webPartDef, clientContext);
        }), Function.createDelegate(this, function () { dfd.reject("Failed to load web part properties"); }));
    }), Function.createDelegate(this, function () { dfd.reject("Failed to load web part collection"); }));

    return dfd.promise();
}

function saveWebPartProperties(wpId, obj) {
    var dfd = $j.Deferred();

    getWebPartProperties(wpId).done(function (webPartProperties, webPartDef, clientContext) {
        for (var key in obj) {
            webPartProperties.set_item(key, obj[key]);
        }
        webPartDef.saveWebPartChanges();
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve();
        }), Function.createDelegate(this, function () { dfd.reject("Failed to save web part properties"); }));
    }).fail(function (err) { dfd.reject(err); });

    return dfd.promise();
}