function loadMembersWebPart(initUsers) {
    var partId = "ElementKOPeoplePicker" + loadMembersWebPart.curId++;
    document.write("<div id='" + partId + "'></div>");
    createKnockoutWebPart(partId, "Members", new PeoplePickerMembersViewModel(initUsers));
}
loadMembersWebPart.curId = 0;