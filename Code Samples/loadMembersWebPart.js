function loadMembersWebPart(initUsers) {
    var model = new PeoplePickerMembersViewModel(initUsers);
    var partId = "Element_" + model.uniqueName;
    partId = partId.replace(/[^A-z0-9]+/g, '');
    document.write("<div id='" + partId + "'></div>");
    if (pageInEditMode()) {
        loadWebPart(partId, webParts.editMembers, function () {
            ko.applyBindings(model, document.getElementById(partId));
        }, true);
    }
    else {
        loadWebPart(partId, webParts.showMembers, function () {
            ko.applyBindings(model, document.getElementById(partId));
        }, true);
    }
}