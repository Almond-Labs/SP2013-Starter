ko.bindingHandlers.clientPeoplePicker = {
    currentId: 0,
    init: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable";
        }

        var currentId = ko.bindingHandlers.clientPeoplePicker.currentId++;
        var currentElemId = "ClientPeoplePicker" + currentId;
        element.setAttribute("id", currentElemId);
        obs._peoplePickerId = currentElemId + "_TopSpan";
        ko.bindingHandlers.clientPeoplePicker.
            initPeoplePicker(currentElemId).done(function (picker) {
            picker.OnValueChangedClientScript = function (elementId, userInfo) {
                var temp = new Array();
                for (var x = 0; x < userInfo.length; x++) {
                    temp[temp.length] = userInfo[x].Key;
                }
                obs(temp);
            };
            ko.bindingHandlers.clientPeoplePicker.update(element, valueAccessor);
        });
    },
    update: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable array";
        }
        if (typeof SPClientPeoplePicker === 'undefined')
            return;

        var peoplePicker =
            SPClientPeoplePicker.SPClientPeoplePickerDict[obs._peoplePickerId];
        if (peoplePicker) {
            var keys = peoplePicker.GetAllUserKeys();
            keys = keys.length > 0 ? keys.split(";") : [];
            var updateKeys = obs() && obs().length ? obs() : [];
            var newKeys = new Array();
            for (var x = 0; x < updateKeys.length; x++) {
                for (var y = 0; y < keys.length && updateKeys[x] != keys[y]; y++) { }
                if (y >= keys.length) {
                    newKeys[newKeys.length] = updateKeys[x];
                }
            }

            if (newKeys.length > 0) {
                peoplePicker.AddUserKeys(newKeys.join(";"));
            }
        }
    },
    initPeoplePicker: function (elementId) {
        var schema = {};
        schema['PrincipalAccountType'] = 'User';
        schema['SearchPrincipalSource'] = 15;
        schema['ResolvePrincipalSource'] = 15;
        schema['AllowMultipleValues'] = true;
        schema['MaximumEntitySuggestions'] = 50;
        //schema['Width'] = '280px'; //use default width

        var dfd = $j.Deferred();

        SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js",
            "clientpeoplepicker.js", "autofill.js"], function () {
            SPClientPeoplePicker_InitStandaloneControlWrapper(elementId, null, schema);
            dfd.resolve(
                SPClientPeoplePicker.SPClientPeoplePickerDict[elementId + "_TopSpan"]);
        });

        return dfd.promise();
    }
};