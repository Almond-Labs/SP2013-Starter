function saveToScriptEditor(wpId, obj) {
    var dfd = $j.Deferred();

    getWebPartProperties(wpId).done(function (wpProps) {
        var content = wpProps.get_item("Content");
        var match = /var options\s*=\s*([^;]*?);/.exec(content);
        if (!match) {
            dfd.reject("unable to update options variable in web part: " + wpId);
            return;
        }

        content = content.replace(match[0], match[0].replace(match[1], JSON.stringify(obj)));
        saveWebPartProperties(wpId, { Content: content }).done(function () {
            dfd.resolve()
        }).fail(self.error);
    }).fail(self.error);

    return dfd.promise();
}