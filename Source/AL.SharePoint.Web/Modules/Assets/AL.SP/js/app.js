//Page Load
var $j = jQuery.noConflict();

$j(document).ready(function () {
    //Search box drop down
    _spBodyOnLoadFunctionNames.push("overrideSearchBox");
});

//Variables
var rev = '?Rev=1.01';
var profilePropertyNames = ["PreferredName", "PictureURL", "AccountName", "Title", "WorkEmail", "SipAddress", "Department"];

var webParts = function () {
    var self = this;
    self.partPath = '/_catalogs/masterpage/al.sp/parts/';
    self.showMembers = self.partPath + 'Members.html';
    self.editMembers = self.partPath + 'EditMembers.html';
};

var dataUrl = function () {
    var self = this;
};

//Handlers
ko.bindingHandlers.clientPeoplePicker = {};
ko.bindingHandlers.clientPeoplePicker.currentId = 0;
ko.bindingHandlers.clientPeoplePicker.buildPicker = function (element, valueAccessor) {
    var obs = valueAccessor();
    if (!ko.isObservable(obs)) {
        throw "clientPeoplePicker binding requires an observable";
    }

    function initializePeoplePicker(elementId) {
        var schema = {};
        schema['PrincipalAccountType'] = 'User';
        schema['SearchPrincipalSource'] = 15;
        schema['ResolvePrincipalSource'] = 15;
        schema['AllowMultipleValues'] = true;
        schema['MaximumEntitySuggestions'] = 50;
        //schema['Width'] = '280px'; //use default width

        // Render and initialize the picker. 
        // Pass the ID of the DOM element that contains the picker, an array of initial
        // PickerEntity objects to set the picker value, and a schema that defines
        // picker properties.
        var users = [];
        if (obs()) {
            var parts = obs().split(";");
            for (var x = 0; x < parts.length; x++) {
                users[users.length] = {
                    AutoFillDisplayText: parts[x].split("|")[1],
                    AutoFillKey: parts[x],
                    Description: "",
                    DisplayText: parts[x].split("|")[1],
                    EntityType: "User",
                    IsResolved: true,
                    Key: parts[x],
                    Resolved: true
                };
            }
        }
        SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
            SPClientPeoplePicker_InitStandaloneControlWrapper(elementId, users, schema);
        });
        //update to read existing usernames from the observable and initialize picker
    }

    var currentId = ko.bindingHandlers.clientPeoplePicker.currentId++;
    var currentElemId = "ClientPeoplePicker" + currentId;
    element.setAttribute("id", currentElemId);
    initializePeoplePicker(currentElemId);

    obs.pickerEntities = function () {
        if (typeof SPClientPeoplePicker == 'undefined')
            return null;

        var peoplePicker = SPClientPeoplePicker.SPClientPeoplePickerDict[currentElemId + "_TopSpan"];
        return peoplePicker.GetAllUserInfo();
    };
};
ko.bindingHandlers.clientPeoplePicker.init = ko.bindingHandlers.clientPeoplePicker.buildPicker;
ko.bindingHandlers.clientPeoplePicker.update = ko.bindingHandlers.clientPeoplePicker.buildPicker;

ko.bindingHandlers.submitOnEnter = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var allBindings = allBindingsAccessor();
        $j(element).keypress(function (event) {
            var keyCode = (event.which ? event.which : event.keyCode);
            if (keyCode === 13) {
                allBindings.submitOnEnter.call(viewModel);
                return false;
            }
            return true;
        });
    },
    update: function () { }
};

ko.bindingHandlers.updatePresence = {
    init: function () { },
    update: function (element, valueAccessor) {
        var props = valueAccessor();
        var sip = props.user.SipAddress;
        if (sip == '') sip = props.user.WorkEmail;
        var elm = $j(props.presence).find('img[name="imnmark"]');
        if (sip && elm) {
            //TODO: Make sure this only gets called once on complete
            ProcessImn();
        }
    }
};

ko.bindingHandlers.starRating = {
    init: function (element, valueAccessor) {
        $j(element).addClass("doc-rating");
        for (var i = 0; i < 5; i++)
            $j("<span>").appendTo(element);

        $j("span", element).each(function (index) {
            $j(this).hover(
                function () {
                    $j(this).prevAll().add(this).addClass("hoverChosen");
                    $j(this).nextAll().addClass("hoverCleared");
                },
                function () {
                    $j(this).prevAll().add(this).removeClass("hoverChosen");
                    $j(this).nextAll().removeClass("hoverCleared");
                }
            ).click(function () {
                var observable = valueAccessor();
                observable(index + 1);
            });
        });
    },
    update: function (element, valueAccessor) {
        var observable = valueAccessor();
        var decRating = observable() - Math.floor(observable());
        var stars = observable() - decRating;
        $j("span", element).each(function (index) {
            if (index < stars) {
                $j(this).toggleClass("chosen", true);
            } else if (decRating > 0) {
                $j(this).toggleClass("halfChosen", decRating >= 0.25 && decRating <= 0.75);
                $j(this).toggleClass("chosen", decRating > 0.75);
                decRating = 0;
            } else
                $j(this).toggleClass("chosen", false);
        });
    }
};

//ViewModels
function PeoplePickerMembersViewModel() {
    var self = this;
    self.error = ko.observable("");
    self.success = ko.observable("");
    self.curId = PeoplePickerMembersViewModel.curId++;
    self.webPropertyName = ("PeoplePickerValues_" + self.curId + "_" + _spPageContextInfo.serverRequestPath.replace(/\//g, "").replace(/\./g, "").replace(/\s/g, "").replace(/%20/g, "")).toLowerCase();
    self.members = ko.observableArray([]);
    self.sortedMembers = self.members;
    self.savedPickerUsers = ko.observable("");
    self.savedPickerUsers.subscribe(function (newValue) {
        if (!newValue)
            return;

        var userNames = newValue.split(";");

        loadUserProfiles(userNames, profilePropertyNames, function (userProfileProperties, index) {
            userProfileProperties.LoginName = userNames[index];
            for (var i = 0; i < profilePropertyNames.length; i++) {
                userProfileProperties[profilePropertyNames[i]] = userProfileProperties[i];
            }
            userProfileProperties.Presence = RenderUserPresence(userProfileProperties);
            self.members.push(userProfileProperties);
        });
    });
    self.getWebProperty = function () {
        var cCtx = SP.ClientContext.get_current();
        var web = cCtx.get_web();
        cCtx.load(web);
        cCtx.executeQueryAsync(Function.createDelegate(this, function () {
            var wProps = web.get_allProperties();
            cCtx.load(wProps);
            cCtx.executeQueryAsync(Function.createDelegate(this, function () {
                self.savedPickerUsers(wProps.get_fieldValues()[self.webPropertyName]);
            }), Function.createDelegate(this, function () { self.onQueryFailed("error loading web properties"); }));
        }), Function.createDelegate(this, function () { self.onQueryFailed("Error getting current web"); }));
    };
    self.saveWebProperty = function () {
        var entities = self.savedPickerUsers.pickerEntities();
        var parts = [];
        for (var x = 0; x < entities.length; x++) {
            parts[parts.length] = entities[x].Key;
        }
        var value = parts.join(";");
        var cCtx = SP.ClientContext.get_current();
        var web = cCtx.get_web();
        cCtx.load(web);
        cCtx.executeQueryAsync(Function.createDelegate(this, function () {
            var wProps = web.get_allProperties();
            wProps.set_item(self.webPropertyName, value);
            cCtx.get_web().update();
            cCtx.load(wProps);
            cCtx.executeQueryAsync(Function.createDelegate(this, function () {
                self.success("Saved " + parts.length + " user(s)");
            }), Function.createDelegate(this, function () { self.onQueryFailed("Error loading web properties"); }));
        }), Function.createDelegate(this, function () { self.onQueryFailed("Error getting current web"); }));
    };
    self.onQueryFailed = function (msg) {
        self.error(msg);
    };

    SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
        self.getWebProperty();
    });
}

PeoplePickerMembersViewModel.curId = 0;

function SearchRatingViewModel(avgRating, siteUrl, listId, listItemId) {
    var self = this;
    self.rating = ko.observable(avgRating);
    self.site = siteUrl;
    self.listId = listId;
    self.itemId = listItemId;
    self.rating.subscribe(function () {
        self.updateRating();
    });

    self.updateRating = function () {
        SPSODAction(['reputation.js'], function () {
            var spCtx = new SP.ClientContext(self.site);
            Microsoft.Office.Server.ReputationModel.Reputation.setRating(spCtx, self.listId, self.itemId, self.rating());
            spCtx.executeQueryAsync(function () {
                SP.UI.Notify.addNotification("Thank you for rating this document", false);
            }, function () {
                SP.UI.Notify.addNotification("There was an error saving your rating", false);
            });
        });
    };
}

//Functions
function loadSPData(url, completeFunction) {
    $j.ajax({
        url: url, method: "GET",
        headers: { "accept": "application/json;odata=verbose" }
    }).success(function (data) {
        completeFunction(data);
    });
}

function loadWebPart(partId, contentFile, complete) {
    $j(document).ready(function () {
        $j('#' + partId).load(contentFile + rev, function () {
            complete();
        });
    });
}

function loadWebPartData(partId, contentFile, getUrl, complete) {
    $j(document).ready(function () {
        $j('#' + partId).load(contentFile + rev, function () {
            $j.get(getUrl).done(function (data) {
                complete(data);
            });
        });
    });
}

function loadTaxonomy(termSetId, collection) {
    var context = SP.ClientContext.get_current();
    var taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
    var termStore = taxonomySession.getDefaultSiteCollectionTermStore();
    var termSet = termStore.getTermSet(termSetId);
    var terms = termSet.get_terms();
    recurseTerms(context, terms, collection);
}

function recurseTerms(context, rootTerms, parentCollection) {
    context.load(rootTerms);
    context.executeQueryAsync(
        function () {
            var termsEnum = rootTerms.getEnumerator();
            while (termsEnum.moveNext()) {
                var currentTerm = termsEnum.get_current();
                var term = { title: currentTerm.get_name(), id: currentTerm.get_id(), subTerms : [] };
                parentCollection.push(term);

                if (currentTerm.get_termsCount() > 0) {
                    recurseTerms(context, currentTerm.get_terms(), term.subTerms);
                }
            }
        },
        function () { });
}

function loadUserProfiles(userNames, propertyNames, callback, clientContext, peopleManager, index) {
    if (index >= userNames.length)
        return;

    if (!clientContext) {
        SPSODAction(['sp.js', 'SP.UserProfiles.js', 'clienttemplates.js'], function () {
            clientContext = SP.ClientContext.get_current();
            peopleManager = new SP.UserProfiles.PeopleManager(clientContext);
            loadUserProfiles(userNames, propertyNames, callback, clientContext, peopleManager, 0);
        });
        return;
    }

    var userProfilePropertiesForUser = new SP.UserProfiles.UserProfilePropertiesForUser(clientContext, userNames[index], propertyNames);
    var userProfileProperties = peopleManager.getUserProfilePropertiesFor(userProfilePropertiesForUser);
    clientContext.load(userProfilePropertiesForUser);
    clientContext.executeQueryAsync(
        function () {
            callback(userProfileProperties, index);
            loadUserProfiles(userNames, propertyNames, callback, clientContext, peopleManager, ++index);
        },
        function () { });
}

function RenderUserPresence(user, fieldSchemaOverride) {
    var renderCtx = new ContextInfo();
    renderCtx.Templates = {};
    renderCtx.Templates["Fields"] = {};

    var fieldSchemaData = fieldSchemaOverride;
    if (!fieldSchemaData)
        fieldSchemaData = { "WithPictureDetail": "1", "PictureSize": "Size_36px" };
    var listSchema = { "EffectivePresenceEnabled": "1", "PresenceAlt": "User Presence" };
    var userData = {
        "id": user.AccountName, "department": user.Department, "jobTitle": user.Title,
        "title": user.PreferredName, "email": user.WorkEmail, "picture": user.PictureURL, "sip": user.SipAddress
    };
    return RenderUserFieldWorker(renderCtx, fieldSchemaData, userData, listSchema);
}

function formatSearchResults(data) {
    var returnData = [];
    var query = data.d.query;
    var results = query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
    for (var x = 0; x < results.length; x++) {
        var cells = results[x].Cells.results;
        var resultObj = {};
        for (var y = 0; y < cells.length; y++) {
            resultObj[cells[y].Key] = cells[y].Value;
        }
        returnData.push(resultObj);
    }
    return returnData;
}

function SPSODAction(sodScripts, onLoadAction) {
    if (SP.SOD.loadMultiple) {
        for (var x = 0; x < sodScripts.length; x++) {
            if (!_v_dictSod[sodScripts[x]]) {
                SP.SOD.registerSod(sodScripts[x], '/_layouts/15/' + sodScripts[x]);
            }
        }
        SP.SOD.loadMultiple(sodScripts, onLoadAction);
    } else
        ExecuteOrDelayUntilScriptLoaded(onLoadAction, sodScripts[0]);
}

function parseDate(jsonDate) {
    var d = new Date(parseInt(jsonDate.substr(6)));
    return d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;

    var match = RegExp('[?&]' + name + '=([^&#]*)').exec(url);
    return match && match[1].replace(/\+/g, ' ');
}

function pageInEditMode() {
    var inEditMode = null;
    if (document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode) {
        inEditMode = document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode.value;
    }
    var wikiInEditMode = null;
    if (document.forms[MSOWebPartPageFormName]._wikiPageMode) {
        wikiInEditMode = document.forms[MSOWebPartPageFormName]._wikiPageMode.value;
    }
    if (!inEditMode && !wikiInEditMode)
        return false;

    return inEditMode == "1" || wikiInEditMode == "Edit";
}

function overrideSearchBox() {
    $j("input.ms-srch-sb-prompt").click(function (event) {
        var nodes = $j("div.ms-qSuggest-listItem");
        if (nodes.length > 0) {
            $j("#NavDropdownListContainer").css({ display: "block", visibility: "visible" });
        }
        else {
            $j(this).next().click();
        }
        return Srch.U.cancelEvent(event.OriginalEvent);
    });
    $j('input.ms-srch-sb-prompt').blur(function () {
        $j("#NavDropdownListContainer").css({ display: "none", visibility: "visible" });
    });
}

function loadWikiMembers() {
    var model = new PeoplePickerMembersViewModel();
    var partId = "Element" + model.webPropertyName;
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