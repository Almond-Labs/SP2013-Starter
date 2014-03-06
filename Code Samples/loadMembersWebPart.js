function loadMembersWebPart(initUsers) {
    var model = new PeoplePickerMembersViewModel(initUsers);
    var partId = "ElementKOPeoplePicker" + loadMembersWebPart.curId++;
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
loadMembersWebPart.curId = 0;