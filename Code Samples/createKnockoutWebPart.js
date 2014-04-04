function createKnockoutWebPart(elementId, wpName, viewModel) {
    SPSODAction(["sp.js"], function () {
        var prefix = "show";
        if (pageInEditMode()) {
            prefix = "edit";
        }
        var templatePath = webParts.partPath() + webParts[prefix + wpName];
        $j('#' + elementId).load(templatePath + rev, function () {
            ko.applyBindings(viewModel, document.getElementById(elementId));
        });
    });
}