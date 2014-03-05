function PeoplePickerMembersViewModel(initUsers) {
    var self = this;
    self.webPartId = ko.observable();
    self.error = ko.observable("");
    self.success = ko.observable("");
    self.curId = PeoplePickerMembersViewModel.curId++;
    self.userNames = ko.observableArray();

    self.saveUsers = function () {
        saveToScriptEditor(self.webPartId(), self.userNames()).done(function () {
            self.success("Save successful");
        }).fail(self.error);
    };

    SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js",
        "clientpeoplepicker.js", "autofill.js"], function () {
        if (initUsers)
            self.userNames(initUsers);
    });
}