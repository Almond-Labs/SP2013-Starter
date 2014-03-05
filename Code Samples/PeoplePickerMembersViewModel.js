function PeoplePickerMembersViewModel(initUsers) {
    var self = this;
    self.webPartId = ko.observable();
    self.error = ko.observable("");
    self.success = ko.observable("");
    self.curId = PeoplePickerMembersViewModel.curId++;
    self.userNames = ko.observableArray();

    self.saveUsers = function () {
        getWebPartProperties(self.webPartId()).done(function (wpProps) {
            var content = wpProps.get_item("Content");
            var match = /var options\s*=\s*([^;]*?);/.exec(content);
            if (match)
                content = content.replace(match[0], match[0].replace(match[1], JSON.stringify(self.userNames())));

            saveWebPartProperties(self.webPartId(), { Content: content }).done(function () {
                self.success("Save successful");
            }).fail(self.error);
        }).fail(self.error);
    };

    SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
        if (initUsers)
            self.userNames(initUsers);
    });
}